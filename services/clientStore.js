import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

let localClients = [];

function toDb(client) {
  return {
    id: client.id,
    loyalty_id: client.loyaltyId,
    name: client.name || "",
    email: client.email || "",
    phone: client.phone || "",
    subscription_id: client.subscriptionId || "",
    visits: Number(client.visits || 0),
    points: Number(client.points || 0),
    total_spent: Number(client.totalSpent || 0),
    rewards_available: Number(client.rewardsAvailable || 0),
    reward_goal: Number(client.rewardGoal || 10),
    reward_notified: Boolean(client.rewardNotified || false),
    segment: client.segment || "new",
    last_visit_at: client.lastVisitAt || null,
    created_at: client.createdAt || new Date().toISOString(),
    updated_at: client.updatedAt || new Date().toISOString(),
  };
}

function fromDb(row) {
  return {
    id: row.id,
    loyaltyId: row.loyalty_id,
    name: row.name || "",
    email: row.email || "",
    phone: row.phone || "",
    subscriptionId: row.subscription_id || "",
    visits: Number(row.visits || 0),
    points: Number(row.points || 0),
    totalSpent: Number(row.total_spent || 0),
    rewardsAvailable: Number(row.rewards_available || 0),
    rewardGoal: Number(row.reward_goal || 10),
    rewardNotified: Boolean(row.reward_notified || false),
    segment: row.segment || "new",
    lastVisitAt: row.last_visit_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function computeSegment(client) {
  const visits = Number(client.visits || 0);
  const points = Number(client.points || 0);
  const totalSpent = Number(client.totalSpent || 0);

  if (points >= 20 || visits >= 10 || totalSpent >= 500) return "vip";
  if (points >= 8 || visits >= 4 || totalSpent >= 120) return "loyal";
  return "new";
}

function enrichClient(client = {}) {
  const fallbackId = client.id || `CL-${Date.now()}`;
  const rewardGoal = Number(client.rewardGoal || 10);
  const points = Number(client.points || 0);

  const normalized = {
    id: fallbackId,
    loyaltyId: client.loyaltyId || fallbackId,
    name: client.name || "",
    email: client.email || "",
    phone: client.phone || "",
    subscriptionId: client.subscriptionId || "",
    visits: Number(client.visits || 0),
    points,
    totalSpent: Number(client.totalSpent || 0),
    rewardGoal,
    rewardNotified: Boolean(client.rewardNotified || false),
    lastVisitAt: client.lastVisitAt || null,
    createdAt: client.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    ...normalized,
    rewardsAvailable: Math.floor(points / rewardGoal),
    segment: computeSegment(normalized),
  };
}

export async function getAllClients() {
  if (!supabase) {
    return localClients.map(enrichClient);
  }

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(fromDb).map(enrichClient);
}

export async function saveAllClients(clients = []) {
  const prepared = clients.map(enrichClient);

  if (!supabase) {
    localClients = prepared;
    return prepared;
  }

  const { error } = await supabase
    .from("clients")
    .upsert(prepared.map(toDb), { onConflict: "id" });

  if (error) throw error;

  return prepared;
}

export async function upsertClient(clientData = {}) {
  const clients = await getAllClients();

  const phone = String(clientData.phone || "").trim();
  const email = String(clientData.email || "").trim().toLowerCase();

  const existing = clients.find((client) => {
    return (
      (clientData.id && client.id === clientData.id) ||
      (phone && String(client.phone || "").trim() === phone) ||
      (email && String(client.email || "").trim().toLowerCase() === email)
    );
  });

  const fallbackId = clientData.id || `CL-${Date.now()}`;

  const merged = enrichClient({
    ...(existing || {}),
    ...clientData,
    id: existing?.id || fallbackId,
    loyaltyId: existing?.loyaltyId || clientData.loyaltyId || fallbackId,
    createdAt: existing?.createdAt || new Date().toISOString(),
  });

  if (!supabase) {
    localClients = existing
      ? localClients.map((client) => (client.id === existing.id ? merged : client))
      : [...localClients, merged];

    return merged;
  }

  const { error } = await supabase
    .from("clients")
    .upsert(toDb(merged), { onConflict: "id" });

  if (error) throw error;

  return merged;
}

export async function refreshClientSegments() {
  const clients = await getAllClients();
  const refreshed = clients.map(enrichClient);
  await saveAllClients(refreshed);
  return refreshed;
}