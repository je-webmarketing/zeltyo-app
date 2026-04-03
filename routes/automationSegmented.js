import express from "express";
import { refreshClientSegments } from "../services/clientStore.js";
import { sendNotificationToSubscription } from "../services/onesignal.js";

const router = express.Router();

console.log("✅ routes/automationSegmented.js chargé");

export async function runSegmentedAutomation(type) {
  const clients = await refreshClientSegments();
  const results = [];

  for (const client of clients) {
    if (!client.subscriptionId) continue;

    const lastVisit = client.lastVisitAt ? new Date(client.lastVisitAt) : null;
    const daysSinceLastVisit = lastVisit
      ? Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    let message = null;

    if (type === "inactive" && daysSinceLastVisit >= 7) {
      message = "On ne vous a pas vu depuis un moment 👀 Revenez profiter d’un avantage.";
    }

    if (type === "loyal" && client.segment === "loyal") {
      message = "Merci pour votre fidélité 🙌 Continuez et débloquez votre récompense.";
    }

    if (type === "vip" && client.segment === "vip") {
      message = "Client VIP ⭐ Un bonus exclusif vous attend lors de votre prochaine visite.";
    }

    if (!message) continue;

    const result = await sendNotificationToSubscription(
      client.subscriptionId,
      message
    );

    results.push({
      phone: client.phone,
      segment: client.segment,
      type,
      result,
    });
  }

  return results;
}

router.post("/run", async (req, res) => {
  try {
    const { type } = req.body;
    const results = await runSegmentedAutomation(type);

    return res.json({ ok: true, results });
  } catch (error) {
    console.error("Erreur automation segmentée :", error);
    return res.status(500).json({ ok: false });
  }
});

export default router;