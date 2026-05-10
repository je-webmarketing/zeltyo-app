import express from "express";
import crypto from "crypto";
import {
  getAllClients,
  upsertClient,
  refreshClientSegments,
  saveAllClients,
} from "../services/clientStore.js";
import { sendNotificationToSubscription } from "../services/onesignal.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

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

router.get("/", requireAuth, requireRole("admin", "merchant_admin"), async (req, res) => {
  try {
    const clients = await getAllClients();
    return res.json({ ok: true, clients });
  } catch (error) {
    console.error("Erreur GET /clients :", error);
    return res.status(500).json({ ok: false, error: "Erreur récupération clients" });
  }
});

router.get("/__debug", blockProduction, async (req, res) => {
  return res.json({
    ok: true,
    message: "clients router OK",
  });
});

router.get("/by-loyalty/:value", async (req, res) => {
  try {
    const value = clean(req.params.value);
    const clients = await getAllClients();

    const client = clients.find((c) => c.loyaltyId === value || c.id === value);

    if (!client) {
      return res.status(404).json({ ok: false, error: "Client introuvable" });
    }

    return res.json({ ok: true, client });
  } catch (error) {
    console.error("Erreur GET /clients/by-loyalty/:value :", error);
    return res.status(500).json({ ok: false, error: "Erreur récupération client" });
  }
});

router.post("/", async (req, res) => {
  try {
    const id = clean(req.body.id);
    const loyaltyId = clean(req.body.loyaltyId);
    const name = clean(req.body.name);
    const email = cleanEmail(req.body.email);
    const phone = cleanPhone(req.body.phone);

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

      return (
        (id && c.id === id) ||
        (phone && cPhone === phone) ||
        (email && cEmail === email)
      );
    });

    await upsertClient({
      id: existingClient?.id || id || crypto.randomUUID(),
      loyaltyId: existingClient?.loyaltyId || loyaltyId || `CL-${Date.now()}`,
      name,
      email,
      phone,
      createdAt: existingClient?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const clientsAfter = await getAllClients();

    const savedClient = clientsAfter.find((c) => {
      const cPhone = cleanPhone(c.phone);
      const cEmail = cleanEmail(c.email);

      return (
        (existingClient?.id && c.id === existingClient.id) ||
        (phone && cPhone === phone) ||
        (email && cEmail === email)
      );
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
    return res.status(500).json({ ok: false, error: "Erreur création client" });
  }
});

router.post("/register-subscription", async (req, res) => {
  try {
    const id = clean(req.body.id);
    const name = clean(req.body.name);
    const phone = cleanPhone(req.body.phone);
    const subscriptionId = clean(req.body.subscriptionId);

    if (!subscriptionId || (!id && !phone)) {
      return res.status(400).json({
        ok: false,
        error: "subscriptionId + id ou phone obligatoire",
      });
    }

    const clients = await upsertClient({
      id,
      name,
      phone,
      subscriptionId,
      updatedAt: new Date().toISOString(),
    });

    return res.json({
      ok: true,
      message: "Client enregistré",
      clients,
    });
  } catch (error) {
    console.error("Erreur POST /clients/register-subscription :", error);
    return res.status(500).json({ ok: false, error: "Erreur enregistrement client" });
  }
});

router.get(
  "/segments",
  requireAuth,
  requireRole("admin", "merchant_admin"),
  async (req, res) => {
    try {
      const clients = await refreshClientSegments();
      return res.json({ ok: true, clients });
    } catch (error) {
      console.error("Erreur GET /clients/segments :", error);
      return res.status(500).json({ ok: false, error: "Erreur segmentation clients" });
    }
  }
);

router.post(
  "/visit",
  requireAuth,
  requireRole("admin", "merchant_admin", "employee"),
  async (req, res) => {
    try {
      const id = clean(req.body.id);
      const phone = cleanPhone(req.body.phone);
      const amount = Number(req.body.amount || 0);
      const points = Number(req.body.points || 1);

      if (!id && !phone) {
        return res.status(400).json({ ok: false, error: "id ou phone obligatoire" });
      }

      if (!Number.isFinite(points) || points < 0 || points > 20) {
        return res.status(400).json({ ok: false, error: "Points invalides" });
      }

      const clients = await getAllClients();
      const index = clients.findIndex((c) => c.id === id || (phone && cleanPhone(c.phone) === phone));

      if (index === -1) {
        return res.status(404).json({ ok: false, error: "Client introuvable" });
      }

      clients[index] = {
        ...clients[index],
        visits: (clients[index].visits ?? 0) + 1,
        points: (clients[index].points ?? 0) + points,
        totalSpent: (clients[index].totalSpent ?? 0) + (Number.isFinite(amount) ? amount : 0),
        lastVisitAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveAllClients(clients);
      const refreshed = await refreshClientSegments();

      const updatedClient = refreshed.find(
        (c) => c.id === id || (phone && cleanPhone(c.phone) === phone)
      );

      if (updatedClient?.subscriptionId) {
        let message = null;

        if (
          updatedClient.points >= (updatedClient.rewardGoal ?? 10) &&
          !updatedClient.rewardNotified
        ) {
          message = "Votre récompense est prête 🎁 Présentez-vous pour en profiter.";
          updatedClient.rewardNotified = true;

          const allClients = await getAllClients();
          const updatedIndex = allClients.findIndex((c) => c.id === updatedClient.id);

          if (updatedIndex !== -1) {
            allClients[updatedIndex] = {
              ...allClients[updatedIndex],
              rewardNotified: true,
              updatedAt: new Date().toISOString(),
            };
            await saveAllClients(allClients);
          }
        } else if (updatedClient.segment === "loyal") {
          message = "Merci pour votre fidélité 🙌 Encore quelques visites et une surprise vous attend.";
        } else if (updatedClient.segment === "vip") {
          message = "Vous faites partie de nos meilleurs clients ⭐ Un bonus VIP vous attend.";
        }

        if (message) {
          await sendNotificationToSubscription(updatedClient.subscriptionId, message);
        }
      }

      const finalClients = await getAllClients();
      const finalClient = finalClients.find(
        (c) => c.id === id || (phone && cleanPhone(c.phone) === phone)
      );

      return res.json({
        ok: true,
        message: "Visite enregistrée",
        client: finalClient || null,
        clients: finalClients,
      });
    } catch (error) {
      console.error("Erreur POST /clients/visit :", error);
      return res.status(500).json({ ok: false, error: "Erreur enregistrement visite" });
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

      if (!phone) {
        return res.status(400).json({ ok: false, error: "phone obligatoire" });
      }

      const clients = await getAllClients();
      const client = clients.find((c) => cleanPhone(c.phone) === phone);

      if (!client) {
        return res.status(404).json({ ok: false, error: "Client introuvable" });
      }

      if (!client.subscriptionId) {
        return res.status(400).json({ ok: false, error: "subscriptionId manquant" });
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
        },
      });
    } catch (error) {
      console.error("Erreur POST /clients/relaunch :", error);
      return res.status(500).json({ ok: false, error: "Erreur relance client" });
    }
  }
);

export default router;