import express from "express";

import {
  getAllPromotions,
  addPromotion,
} from "../services/promotionStore.js";

const router = express.Router();

router.get("/public/:businessId", async (req, res) => {
  try {
    const { businessId } = req.params;

    const promotions = await getAllPromotions();

    const filtered = promotions.filter(
      (promo) => promo.businessId === businessId
    );

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

export default router;