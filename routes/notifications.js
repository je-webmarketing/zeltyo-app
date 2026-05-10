import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

const MAX_MESSAGE_LENGTH = 180;

function clean(value) {
  return String(value || "").trim();
}

router.post(
  "/send",
  requireAuth,
  requireRole("merchant_admin"),
  async (req, res) => {
    const subscriptionId = clean(req.body.subscriptionId);
    const message = clean(req.body.message).slice(0, MAX_MESSAGE_LENGTH);

    if (!subscriptionId || !message) {
      return res.status(400).json({
        ok: false,
        error: "subscriptionId et message sont obligatoires",
      });
    }

    try {
      const response = await fetch(
        "https://api.onesignal.com/notifications?c=push",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Key ${process.env.ONESIGNAL_API_KEY}`,
          },
          body: JSON.stringify({
            app_id: process.env.ONESIGNAL_APP_ID,
            target_channel: "push",
            include_subscription_ids: [subscriptionId],
            contents: { fr: message, en: message },
            headings: { fr: "Zeltyo", en: "Zeltyo" },
          }),
        }
      );

      const data = await response.json();

      return res.status(response.ok ? 200 : response.status).json({
        ok: response.ok,
        onesignal: data,
      });
    } catch (error) {
      console.error("Erreur OneSignal :", error.message);
      return res.status(500).json({
        ok: false,
        error: "Erreur serveur notification",
      });
    }
  }
);

export default router;