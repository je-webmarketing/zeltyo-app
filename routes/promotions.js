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

    const now = new Date();

const filtered = promotions.filter((promo) => {
  const status = String(promo.status || "").toLowerCase();

  const validUntil = promo.validUntil
    ? new Date(promo.validUntil)
    : null;

  const isExpired = validUntil && validUntil < now;

  return (
    promo.businessId === businessId &&
    !isExpired &&
    (
      status === "active" ||
      status === "actif" ||
      status === ""
    )
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

    const promotions = await getAllPromotions();

    const updated = promotions.map((promo) =>
      promo.id === id
        ? {
            ...promo,
            status,
          }
        : promo
    );

    await saveAllPromotions(updated);

    return res.json({
      ok: true,
    });
  } catch (error) {
    console.error("Erreur update status promo :", error);

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

    const updated = promotions.map((promo) =>
      promo.id === id
        ? {
            ...promo,
            status: "Archivée",
            archivedAt: new Date().toISOString(),
          }
        : promo
    );

    await saveAllPromotions(updated);

    return res.json({
      ok: true,
    });
  } catch (error) {
    console.error("Erreur archive promo :", error);

    return res.status(500).json({
      ok: false,
      error: "Erreur serveur",
    });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;

    const promotions = await getAllPromotions();

    const updated = promotions.map((promo) => {
      if (String(promo.id) !== String(id)) {
        return promo;
      }

      return {
        ...promo,
        status:
          promo.status === "Active"
            ? "Pause"
            : "Active",
      };
    });

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

    const updated = promotions.map((promo) => {
      if (String(promo.id) !== String(id)) {
        return promo;
      }

      return {
        ...promo,
        status: "Archivée",
        archivedAt: new Date().toISOString(),
      };
    });

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