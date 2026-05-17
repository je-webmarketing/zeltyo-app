import express from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function toDb(data = {}) {
  return {
    id: data.id,
    name: data.name || "",
    country: data.country || "",
    city: data.city || "",
    zone_label: data.zoneLabel || "",
    radius_km: Number(data.radiusKm || 0),
    latitude: data.latitude ? Number(data.latitude) : null,
    longitude: data.longitude ? Number(data.longitude) : null,
    reward_goal: Number(data.rewardGoal || 10),
    reward_label: data.rewardLabel || "",
    updated_at: new Date().toISOString(),
  };
}

function fromDb(row) {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    city: row.city,
    zoneLabel: row.zone_label,
    radiusKm: row.radius_km,
    latitude: row.latitude,
    longitude: row.longitude,
    rewardGoal: row.reward_goal,
    rewardLabel: row.reward_label,
    updatedAt: row.updated_at,
  };
}

router.get("/:businessId", async (req, res) => {
  const { businessId } = req.params;

  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (error || !data) {
    return res.status(404).json({ ok: false, error: "Commerce introuvable" });
  }

  return res.json({ ok: true, business: fromDb(data) });
});

router.patch(
  "/:businessId",
  requireAuth,
  requireRole("admin", "merchant_admin"),
  async (req, res) => {
    const { businessId } = req.params;

    const payload = toDb({
      ...req.body,
      id: businessId,
    });

    const { data, error } = await supabase
      .from("businesses")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("Erreur sauvegarde business :", error);
      return res.status(500).json({ ok: false, error: "Erreur sauvegarde commerce" });
    }

    return res.json({ ok: true, business: fromDb(data) });
  }
);

export default router;