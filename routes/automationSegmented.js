import express from "express";
import { refreshClientSegments } from "../services/clientStore.js";
import {
  sendNotificationToSubscription,
  sendPush,
} from "../services/onesignal.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

console.log("✅ routes/automationSegmented.js chargé");

const ALLOWED_TYPES = ["inactive", "loyal", "vip", "near_reward"];

function cleanType(value) {
  return String(value || "").trim();
}

function isAllowedType(type) {
  return ALLOWED_TYPES.includes(type);
}

export async function runSegmentedAutomation(type) {
  const safeType = cleanType(type);

  if (!isAllowedType(safeType)) {
    throw new Error("Type de segmentation invalide");
  }

  const clients = await refreshClientSegments();
  const results = [];

  for (const client of clients) {
    if (!client.subscriptionId) continue;

    const lastVisit = client.lastVisitAt ? new Date(client.lastVisitAt) : null;
    const daysSinceLastVisit =
      lastVisit && !Number.isNaN(lastVisit.getTime())
        ? Math.floor((Date.now() - lastVisit.getTime()) / 86400000)
        : null;

    let message = null;

    if (
      safeType === "inactive" &&
      daysSinceLastVisit !== null &&
      daysSinceLastVisit >= 7
    ) {
      message =
        "On ne vous a pas vu depuis un moment 👀 Revenez profiter d’un avantage.";
    }

    if (safeType === "loyal" && client.segment === "loyal") {
      message =
        "Merci pour votre fidélité 🙌 Continuez et débloquez votre récompense.";
    }

    if (safeType === "vip" && client.segment === "vip") {
      message =
        "Client VIP ⭐ Un bonus exclusif vous attend lors de votre prochaine visite.";
    }

    if (!message) continue;

    const result = await sendNotificationToSubscription(
      client.subscriptionId,
      message
    );

    results.push({
      clientId: client.id,
      segment: client.segment,
      type: safeType,
      result,
    });
  }

  return results;
}

router.post(
  "/run",
  requireAuth,
  requireRole("merchant_admin"),
  async (req, res) => {
    try {
      const type = cleanType(req.body.type);

      if (!isAllowedType(type)) {
        return res.status(400).json({
          ok: false,
          error: "Type de segmentation invalide",
        });
      }

      const results = await runSegmentedAutomation(type);

      return res.json({
        ok: true,
        count: results.length,
        results,
      });
    } catch (error) {
      console.error("Erreur automation segmentée :", error.message);
      return res.status(500).json({
        ok: false,
        error: "Erreur automation segmentée",
      });
    }
  }
);

router.post(
  "/send-smart-promo",
  requireAuth,
  requireRole("merchant_admin"),
  async (req, res) => {
    try {
      const type = cleanType(req.body.type);

      if (!isAllowedType(type)) {
        return res.status(400).json({
          ok: false,
          error: "Type de promotion invalide",
        });
      }

      const clients = await refreshClientSegments();

      let filteredClients = [];

      if (type === "inactive") {
        filteredClients = clients.filter(
          (client) => client.segment === "inactive"
        );
      }

      if (type === "vip") {
        filteredClients = clients.filter((client) => client.segment === "vip");
      }

      if (type === "loyal") {
        filteredClients = clients.filter((client) => client.segment === "loyal");
      }

      if (type === "near_reward") {
        filteredClients = clients.filter((client) => {
          const points = Number(client.points || 0);
          const rewardGoal = Number(client.rewardGoal || 10);
          return points >= rewardGoal - 2 && points < rewardGoal;
        });
      }

      const withSubscription = filteredClients.filter(
        (client) => client.subscriptionId && client.phone
      );

      if (!withSubscription.length) {
        return res.json({
          ok: true,
          count: 0,
          message: "Aucun client ciblé",
        });
      }

      const externalIds = withSubscription.map((client) => client.phone);

      const result = await sendPush({
        title: "🎯 Offre personnalisée",
        message: "On pense à vous 😉 Revenez profiter d’une offre spéciale !",
        externalIds,
      });

      return res.json({
        ok: true,
        count: withSubscription.length,
        result,
      });
    } catch (error) {
      console.error("Erreur send-smart-promo :", error.message);

      return res.status(500).json({
        ok: false,
        error: "Erreur envoi promotion segmentée",
      });
    }
  }
);

export default router;