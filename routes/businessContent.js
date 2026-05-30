import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function clean(value) {
  return String(value || "").trim();
}

function toDb(item = {}) {
  return {
    id: item.id || `CONTENT-${Date.now()}`,
    business_id: clean(item.businessId),
    type: clean(item.type || "menu"),
    title: clean(item.title),
    description: clean(item.description),
    price: clean(item.price),
    file_name: clean(item.fileName),
    mime_type: clean(item.mimeType),
    file_data: item.fileData || "",
    active: item.active !== false,
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function fromDb(row = {}) {
  return {
    id: row.id,
    businessId: row.business_id,
    type: row.type,
    title: row.title || "",
    description: row.description || "",
    price: row.price || "",
    fileName: row.file_name || "",
    mimeType: row.mime_type || "",
    fileData: row.file_data || "",
    active: row.active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.post("/", async (req, res) => {
  try {
    const item = toDb(req.body);

    if (!item.business_id) {
      return res.status(400).json({
        ok: false,
        error: "businessId obligatoire",
      });
    }

    const { data, error } = await supabase
      .from("business_content")
      .upsert(item, { onConflict: "id" })
      .select("*")
      .single();

    if (error) throw error;

    return res.json({
      ok: true,
      item: fromDb(data),
    });
  } catch (error) {
    console.error("Erreur POST /business-content :", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur sauvegarde contenu",
    });
  }
});

router.get("/public/:businessId", async (req, res) => {
  try {
    const businessId = clean(req.params.businessId);

    const { data, error } = await supabase
      .from("business_content")
      .select("*")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({
      ok: true,
      contents: (data || []).map(fromDb),
    });
  } catch (error) {
    console.error("Erreur GET /business-content/public :", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur récupération contenus",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = clean(req.params.id);

    const { error } = await supabase
      .from("business_content")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return res.json({
      ok: true,
    });
  } catch (error) {
    console.error("Erreur DELETE /business-content :", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur suppression contenu",
    });
  }
});

export default router;