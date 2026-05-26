import express from "express";
import { sendPushNotification } from "../services/onesignal.js";
import {
  getAllPromotions,
  saveAllPromotions,
  addPromotion,
} from "../services/promotionStore.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";

const router = express.Router();

const ACTIVE_STATUSES = ["active", "actif", ""];

function clean(value) {
  return String(value || "").trim();
}

function isSameBusiness(req, businessId) {
  return clean(req.user?.businessId) === clean(businessId);
}

router.get("/public/:businessId", async (req, res) => {
  try {
    const { businessId } = req.params;
    const promotions = await getAllPromotions();
    const now = new Date();

    const filtered = promotions.filter((promo) => {
      const status = String(promo.status || "").toLowerCase();
      const validUntil = promo.validUntil ? new Date(promo.validUntil) : null;
      const isExpired = validUntil && validUntil < now;

      return (
        clean(promo.businessId) === clean(businessId) &&
        !isExpired &&
        ACTIVE_STATUSES.includes(status)
      );
    });

    return res.json({ ok: true, promotions: filtered });
  } catch (error) {
    console.error("Erreur GET promotions publiques :", error);
    return res.status(500).json({ ok: false, error: "Erreur serveur" });
  }
});

router.post(
  "/",
  requireAuth,
  requireRole("admin", "merchant_admin"),
  async (req, res) => {
    try {
      const businessId = clean(req.user?.businessId || req.body.businessId);

      if (!businessId) {
        return res.status(400).json({
          ok: false,
          error: "businessId obligatoire",
        });
      }

      const promotion = {
        id: `PROMO-${Date.now()}`,
        ...req.body,
        businessId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addPromotion(promotion);

      try {
        await sendPushNotification({
          headings: { fr: "🎁 Nouvelle offre disponible" },
          contents: {
            fr: `${promotion.title || "Une nouvelle promotion"} est disponible près de vous.`,
          },
          included_segments: ["Subscribed Users"],
        });
      } catch (pushError) {
        console.error("Erreur push promotion :", pushError);
      }

      return res.json({ ok: true, promotion });
    } catch (error) {
      console.error("Erreur création promotion :", error);
      return res.status(500).json({ ok: false, error: "Erreur serveur" });
    }
  }
);

router.patch(
  "/:id/status",
  requireAuth,
  requireRole("admin", "merchant_admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const allowedStatuses = ["Active", "Pause", "Archivée"];

      if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({
          ok: false,
          error: "Statut invalide",
        });
      }

      const promotions = await getAllPromotions();
      const target = promotions.find((promo) => clean(promo.id) === clean(id));

      if (!target) {
        return res.status(404).json({
          ok: false,
          error: "Promotion introuvable",
        });
      }

      if (!isSameBusiness(req, target.businessId)) {
        return res.status(403).json({
          ok: false,
          error: "Action interdite sur ce commerce",
        });
      }

      const updated = promotions.map((promo) => {
        if (clean(promo.id) !== clean(id)) return promo;

        return {
          ...promo,
          status: status || (promo.status === "Active" ? "Pause" : "Active"),
          updatedAt: new Date().toISOString(),
        };
      });

      await saveAllPromotions(updated);

      return res.json({ ok: true });
    } catch (error) {
      console.error("Erreur PATCH status promotion :", error);
      return res.status(500).json({ ok: false, error: "Erreur serveur" });
    }
  }
);

router.patch(
  "/:id/archive",
  requireAuth,
  requireRole("admin", "merchant_admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const promotions = await getAllPromotions();

      const target = promotions.find((promo) => clean(promo.id) === clean(id));

      if (!target) {
        return res.status(404).json({
          ok: false,
          error: "Promotion introuvable",
        });
      }

      if (!isSameBusiness(req, target.businessId)) {
        return res.status(403).json({
          ok: false,
          error: "Action interdite sur ce commerce",
        });
      }

      const updated = promotions.map((promo) => {
        if (clean(promo.id) !== clean(id)) return promo;

        return {
          ...promo,
          status: "Archivée",
          archivedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      await saveAllPromotions(updated);

      return res.json({ ok: true });
    } catch (error) {
      console.error("Erreur archive promotion :", error);
      return res.status(500).json({ ok: false, error: "Erreur serveur" });
    }
  }
);

export default router;