import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  sendPush,
  sendNotificationToSubscription,
} from "../services/onesignal.js";

const router = express.Router();

const MAX_MESSAGE_LENGTH = 180;
const MAX_TITLE_LENGTH = 60;
const MAX_EXTERNAL_IDS = 200;

function clean(value) {
  return String(value || "").trim();
}

function safeMessage(value, fallback) {
  const message = clean(value || fallback);
  return message.slice(0, MAX_MESSAGE_LENGTH);
}

function safeTitle(value, fallback = "Zeltyo") {
  const title = clean(value || fallback);
  return title.slice(0, MAX_TITLE_LENGTH);
}

if (process.env.NODE_ENV !== "production") {
  router.post("/test", async (req, res) => {
    try {
      const result = await sendPush({
        title: "🔥 Zeltyo Test",
        message: "Tout fonctionne parfaitement 🚀",
        externalIds: ["0600000000"],
      });

      return res.json({ ok: true, result });
    } catch (error) {
      console.error("Erreur test notification :", error.message);
      return res.status(500).json({
        ok: false,
        error: "Erreur test notification",
      });
    }
  });
}

router.post(
  "/send-to-subscription",
  requireAuth,
  requireRole("merchant_admin"),
  async (req, res) => {
    try {
      const subscriptionId = clean(req.body.subscriptionId);
      const message = safeMessage(
        req.body.message,
        "🎁 Nouvelle offre disponible !"
      );

      if (!subscriptionId) {
        return res.status(400).json({
          ok: false,
          error: "subscriptionId manquant",
        });
      }

      const result = await sendNotificationToSubscription(subscriptionId, message);

      return res.json({
        ok: true,
        result,
      });
    } catch (error) {
      console.error("Erreur send-to-subscription :", error.message);
      return res.status(500).json({
        ok: false,
        error: "Erreur envoi notification",
      });
    }
  }
);

router.post(
  "/send-to-segment",
  requireAuth,
  requireRole("merchant_admin"),
  async (req, res) => {
    try {
      const externalIds = Array.isArray(req.body.externalIds)
        ? req.body.externalIds.map(clean).filter(Boolean).slice(0, MAX_EXTERNAL_IDS)
        : [];

      const title = safeTitle(req.body.title, "Zeltyo");
      const message = safeMessage(
        req.body.message,
        "🎁 Offre spéciale pour vous !"
      );

      if (!externalIds.length) {
        return res.status(400).json({
          ok: false,
          error: "externalIds manquant",
        });
      }

      const result = await sendPush({
        title,
        message,
        externalIds,
      });

      return res.json({
        ok: true,
        count: externalIds.length,
        result,
      });
    } catch (error) {
      console.error("Erreur send-to-segment :", error.message);
      return res.status(500).json({
        ok: false,
        error: "Erreur envoi segment",
      });
    }
  }
);

export default router;