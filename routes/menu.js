import express from "express";

const router = express.Router();

let menuItems = [];

router.get("/__debug", (req, res) => {
  res.json({
    ok: true,
    message: "menu router OK",
    count: menuItems.length,
    items: menuItems,
  });
});

router.get("/", (req, res) => {
  res.json({
    ok: true,
    items: menuItems,
  });
});

router.post("/", (req, res) => {
  try {
    const { name, description, price, category, active } = req.body;

    if (!name || price === undefined || price === null || price === "") {
      return res.status(400).json({
        ok: false,
        error: "Nom et prix obligatoires",
      });
    }

    const item = {
      id: `MENU-${Date.now()}`,
      name: String(name).trim(),
      description: String(description || "").trim(),
      price: Number(price),
      category: String(category || "Snacking"),
      active: active !== false,
      createdAt: new Date().toISOString(),
    };

    menuItems.unshift(item);

    return res.status(201).json({
      ok: true,
      message: "Produit ajouté au menu",
      item,
      items: menuItems,
    });
  } catch (error) {
    console.error("Erreur POST /menu :", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur ajout menu",
    });
  }
});

router.patch("/:id/toggle", (req, res) => {
  try {
    const { id } = req.params;

    menuItems = menuItems.map((item) =>
      item.id === id ? { ...item, active: !item.active } : item
    );

    const updated = menuItems.find((item) => item.id === id);

    if (!updated) {
      return res.status(404).json({
        ok: false,
        error: "Produit introuvable",
      });
    }

    return res.json({
      ok: true,
      message: "Produit mis à jour",
      item: updated,
      items: menuItems,
    });
  } catch (error) {
    console.error("Erreur PATCH /menu/:id/toggle :", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur modification menu",
    });
  }
});

router.get("/:businessId", (req, res) => {
  const { businessId } = req.params;

  const items = menuItems.filter(
    (item) => item.businessId === businessId && item.active !== false
  );

  return res.json({
    ok: true,
    businessId,
    count: items.length,
    items,
  });
});

export default router;