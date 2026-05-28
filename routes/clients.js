import express from "express";
import crypto from "crypto";
import {
  getAllClients,
  upsertClient,
  refreshClientSegments,
  rewardClientVisit,
} from "../services/clientStore.js";
import { sendNotificationToSubscription } from "../services/onesignal.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";

const router = express.Router();

console.log("✅ routes/clients.js chargé");

function blockProduction(req, res, next) {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      ok: false,
      error: "Route désactivée en production",
    });
  }
  return next();
}

function clean(value) {
  return String(value || "").trim();
}

function cleanEmail(value) {
  return clean(value).toLowerCase();
}

function cleanPhone(value) {
  return clean(value).replace(/\s/g, "");
}

function getUserBusinessId(req) {
  return clean(req.user?.businessId);
}

function getBodyBusinessId(req) {
  return clean(req.body?.businessId);
}

function sameBusiness(client, businessId) {
  return String(client?.businessId || client?.business_id || "") === String(businessId || "");
}

function filterClientsByBusiness(clients, req) {
  const businessId = getUserBusinessId(req);
  if (!businessId) return [];
  return clients.filter((client) => sameBusiness(client, businessId));
}

router.get(
  "/",
  requireAuth,
  requireRole("admin", "merchant_admin", "merchant_employee", "employee"),
  async (req, res) => {
    try {
      const allClients = await getAllClients();
      const clients = filterClientsByBusiness(allClients, req);

      return res.json({ ok: true, clients });
    } catch (error) {
      console.error("Erreur GET /clients :", error);
      return res.status(500).json({
        ok: false,
        error: "Erreur récupération clients",
      });
    }
  }
);

router.get("/__debug", blockProduction, async (req, res) => {
  return res.json({
    ok: true,
    message: "clients router OK",
  });
});

router.get("/by-loyalty/:value", async (req, res) => {
  try {
    const value = clean(req.params.value);
    const businessId = clean(req.query.businessId);
    const clients = await getAllClients();

    const client = clients.find((c) => {
      const matchIdentity = c.loyaltyId === value || c.id === value;
      if (!matchIdentity) return false;
      if (!businessId) return true;
      return sameBusiness(c, businessId);
    });

    if (!client) {
      return res.status(404).json({
        ok: false,
        error: "Client introuvable",
      });
    }

    return res.json({ ok: true, client });
  } catch (error) {
    console.error("Erreur GET /clients/by-loyalty/:value :", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur récupération client",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const id = clean(req.body.id);
    const loyaltyId = clean(req.body.loyaltyId);
    const name = clean(req.body.name);
    const email = cleanEmail(req.body.email);
    const phone = cleanPhone(req.body.phone);
    const businessId = getBodyBusinessId(req) || getUserBusinessId(req);

    if (!businessId) {
      return res.status(400).json({
        ok: false,
        error: "businessId obligatoire",
      });
    }

    if (!name || (!phone && !email)) {
      return res.status(400).json({
        ok: false,
        error: "Nom + téléphone ou email obligatoire",
      });
    }

    const clientsBefore = await getAllClients();

    const existingClient = clientsBefore.find((c) => {
      const cPhone = cleanPhone(c.phone);
      const cEmail = cleanEmail(c.email);

      const sameIdentity =
        (id && c.id === id) ||
        (phone && cPhone === phone) ||
        (email && cEmail === email);

      return sameIdentity && sameBusiness(c, businessId);
    });

    await upsertClient({
      id: existingClient?.id || id || crypto.randomUUID(),
      loyaltyId: existingClient?.loyaltyId || loyaltyId || `CL-${Date.now()}`,
      businessId,
      name,
      email,
      phone,
      points: Number(existingClient?.points || 0),
      visits: Number(existingClient?.visits || 0),
      rewardsAvailable: Number(existingClient?.rewardsAvailable || 0),
      createdAt: existingClient?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const clientsAfter = await getAllClients();

    const savedClient = clientsAfter.find((c) => {
      const cPhone = cleanPhone(c.phone);
      const cEmail = cleanEmail(c.email);

      const sameIdentity =
        (existingClient?.id && c.id === existingClient.id) ||
        (id && c.id === id) ||
        (phone && cPhone === phone) ||
        (email && cEmail === email);

      return sameIdentity && sameBusiness(c, businessId);
    });

    return res.status(existingClient ? 200 : 201).json({
      ok: true,
      created: !existingClient,
      message: existingClient
        ? "Client déjà existant, fiche mise à jour"
        : "Client créé",
      client: savedClient || null,
    });
  } catch (error) {
    console.error("Erreur POST /clients :", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur création client",
    });
  }
});

router.post("/register-subscription", async (req, res) => {
  try {
    const id = clean(req.body.id);
    const loyaltyId = clean(req.body.loyaltyId);
    const name = clean(req.body.name);
    const phone = cleanPhone(req.body.phone);
    const email = cleanEmail(req.body.email);
    const subscriptionId = clean(req.body.subscriptionId);
    const externalId = clean(req.body.externalId);
    const businessId = getBodyBusinessId(req);

    if (!subscriptionId || (!id && !phone && !loyaltyId)) {
      return res.status(400).json({
        ok: false,
        error: "subscriptionId + id, loyaltyId ou phone obligatoire",
      });
    }

    if (!businessId) {
      return res.status(400).json({
        ok: false,
        error: "businessId obligatoire",
      });
    }

    const client = await upsertClient({
      id,
      loyaltyId,
      name,
      phone,
      email,
      businessId,
      subscriptionId,
      externalId,
      updatedAt: new Date().toISOString(),
    });

    return res.json({
      ok: true,
      message: "Client enregistré",
      client,
    });
  } catch (error) {
    console.error("Erreur POST /clients/register-subscription :", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur enregistrement client",
    });
  }
});

router.get(
  "/segments",
  requireAuth,
  requireRole("admin", "merchant_admin"),
  async (req, res) => {
    try {
      const refreshed = await refreshClientSegments();
      const clients = filterClientsByBusiness(refreshed, req);

      return res.json({ ok: true, clients });
    } catch (error) {
      console.error("Erreur GET /clients/segments :", error);
      return res.status(500).json({
        ok: false,
        error: "Erreur segmentation clients",
      });
    }
  }
);

router.post(
  "/visit",
  requireAuth,
  requireRole("admin", "merchant_admin", "merchant_employee", "employee"),
  async (req, res) => {
    try {
      const id = clean(req.body.id);
      const phone = cleanPhone(req.body.phone);
      const amount = Number(req.body.amount || 0);
      const points = Number(req.body.points || 1);
      const businessId = getUserBusinessId(req);

      if (!businessId) {
        return res.status(400).json({
          ok: false,
          error: "businessId manquant",
        });
      }

      if (!id && !phone) {
        return res.status(400).json({
          ok: false,
          error: "id ou phone obligatoire",
        });
      }

      if (!Number.isFinite(points) || points < 0 || points > 20) {
        return res.status(400).json({
          ok: false,
          error: "Points invalides",
        });
      }

      let loyaltyId = id;

      if (phone) {
        const clients = await getAllClients();
        const phoneClient = clients.find(
          (client) => cleanPhone(client.phone) === phone && sameBusiness(client, businessId)
        );

        if (!phoneClient) {
          return res.status(404).json({
            ok: false,
            error: "Client introuvable pour ce commerce",
          });
        }

        loyaltyId = phoneClient.loyaltyId || phoneClient.id;
      }

      const updatedClient = await rewardClientVisit({
        loyaltyId,
        businessId,
        points,
        amount,
      });

      const refreshed = await refreshClientSegments();

      const refreshedClient =
        refreshed.find(
          (client) =>
            sameBusiness(client, businessId) &&
            (client.id === updatedClient.id ||
              client.loyaltyId === updatedClient.loyaltyId)
        ) || updatedClient;

      if (refreshedClient?.subscriptionId) {
        let message = null;

        if (
          Number(refreshedClient.points || 0) >=
            Number(refreshedClient.rewardGoal ?? 10) &&
          !refreshedClient.rewardNotified
        ) {
          message = "Votre récompense est prête 🎁 Présentez-vous pour en profiter.";

          await upsertClient({
            ...refreshedClient,
            rewardNotified: true,
            updatedAt: new Date().toISOString(),
          });
        } else if (refreshedClient.segment === "loyal") {
          message =
            "Merci pour votre fidélité 🙌 Encore quelques visites et une surprise vous attend.";
        } else if (refreshedClient.segment === "vip") {
          message =
            "Vous faites partie de nos meilleurs clients ⭐ Un bonus VIP vous attend.";
        }

        if (message) {
          await sendNotificationToSubscription(refreshedClient.subscriptionId, message);
        }
      }

      const finalClients = await getAllClients();
      const businessClients = finalClients.filter((client) =>
        sameBusiness(client, businessId)
      );

      const finalClient =
        businessClients.find(
          (client) =>
            client.id === refreshedClient.id ||
            client.loyaltyId === refreshedClient.loyaltyId
        ) || refreshedClient;

      return res.json({
        ok: true,
        message: "Visite enregistrée",
        client: finalClient,
        clients: businessClients,
      });
    } catch (error) {
      console.error("Erreur POST /clients/visit :", error);
      return res.status(500).json({
        ok: false,
        error: error.message || "Erreur enregistrement visite",
      });
    }
  }
);

router.post(
  "/relaunch",
  requireAuth,
  requireRole("admin", "merchant_admin"),
  async (req, res) => {
    try {
      const phone = cleanPhone(req.body.phone);
      const businessId = getUserBusinessId(req);

      if (!businessId) {
        return res.status(400).json({
          ok: false,
          error: "businessId manquant",
        });
      }

      if (!phone) {
        return res.status(400).json({
          ok: false,
          error: "phone obligatoire",
        });
      }

      const clients = await getAllClients();

      const client = clients.find(
        (c) => cleanPhone(c.phone) === phone && sameBusiness(c, businessId)
      );

      if (!client) {
        return res.status(404).json({
          ok: false,
          error: "Client introuvable pour ce commerce",
        });
      }

      if (!client.subscriptionId) {
        return res.status(400).json({
          ok: false,
          error: "subscriptionId manquant",
        });
      }

      await sendNotificationToSubscription(
        client.subscriptionId,
        "On ne vous a pas vu depuis un moment 👀 Revenez profiter d’un avantage spécial."
      );

      return res.json({
        ok: true,
        message: "Relance envoyée",
        client: {
          id: client.id,
          name: client.name,
          phone: client.phone,
          businessId: client.businessId,
        },
      });
    } catch (error) {
      console.error("Erreur POST /clients/relaunch :", error);
      return res.status(500).json({
        ok: false,
        error: "Erreur relance client",
      });
    }
  }
);

export default router;