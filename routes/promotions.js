import express from "express";
import { sendPushNotification } from "../services/onesignal.js";
import {
  getAllPromotions,
  saveAllPromotions,
  addPromotion,
} from "../services/promotionStore.js";

const router = express.Router();

const ACTIVE_STATUSES = ["active", "actif", ""];

router.get("/public/:businessId", async (req, res) => {
  try {
    const { businessId } = req.params;
    const promotions = await getAllPromotions();
    const now = new Date();

    const filtered = promotions.filter((promo) => {
      const status = String(promo.status || "").toLowerCase();

      const validUntil = promo.validUntil
        ? new Date(promo.validUntil)
        : null;

      const isExpired = validUntil && validUntil < now;

      return (
        String(promo.businessId) === String(businessId) &&
        !isExpired &&
        ACTIVE_STATUSES.includes(status)
      );
    });

    return res.json({
      ok: true,
      promotions: filtered,
    });
  } catch (error) {
    console.error("Erreur GET promotions publiques :", error);

    return res.status(500).json({
      ok: false,
      error: "Erreur serveur",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const promotion = {
      id: `PROMO-${Date.now()}`,
      ...req.body,
      createdAt: new Date().toISOString(),
    };

    await addPromotion(promotion);

    try {
      await sendPushNotification({
        headings: {
          fr: "🎁 Nouvelle offre disponible",
        },
        contents: {
          fr: `${promotion.title || "Une nouvelle promotion"} est disponible près de vous.`,
        },
        included_segments: ["Subscribed Users"],
      });

      console.log("✅ Push promotion envoyé");
    } catch (pushError) {
      console.error("❌ Erreur push promotion :", pushError);
    }

    return res.json({
      ok: true,
      promotion,
    });
  } catch (error) {
    console.error("Erreur création promotion :", error);

    return res.status(500).json({
      ok: false,
      error: "Erreur serveur",
    });
  }
});

router.patch("/:id/status", async (req, res) => {
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

    let found = false;

    const updated = promotions.map((promo) => {
      if (String(promo.id) !== String(id)) {
        return promo;
      }

      found = true;

      return {
        ...promo,
        status: status || (promo.status === "Active" ? "Pause" : "Active"),
        updatedAt: new Date().toISOString(),
      };
    });

    if (!found) {
      return res.status(404).json({
        ok: false,
        error: "Promotion introuvable",
      });
    }

    await saveAllPromotions(updated);

    return res.json({
      ok: true,
    });
  } catch (error) {
    console.error("Erreur PATCH status promotion :", error);

    return res.status(500).json({
      ok: false,
      error: "Erreur serveur",
    });
  }
});

router.patch("/:id/archive", async (req, res) => {
  try {
    const { id } = req.params;
    const promotions = await getAllPromotions();

    let found = false;

    const updated = promotions.map((promo) => {
      if (String(promo.id) !== String(id)) {
        return promo;
      }

      found = true;

      return {
        ...promo,
        status: "Archivée",
        archivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    if (!found) {
      return res.status(404).json({
        ok: false,
        error: "Promotion introuvable",
      });
    }

    await saveAllPromotions(updated);

    return res.json({
      ok: true,
    });
  } catch (error) {
    console.error("Erreur archive promotion :", error);

    return res.status(500).json({
      ok: false,
      error: "Erreur serveur",
    });
  }
});

export default router;