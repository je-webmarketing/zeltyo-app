import { db } from "./firebaseAdmin.js";

const isFirestoreReady = !!db;
const COLLECTION_NAME = "clients";

let localClients = [];

function getCollection() {
  if (!db) return null;
  return db.collection(COLLECTION_NAME);
}

function normalizeClient(client = {}) {
  const fallbackId = `CL-${Date.now()}`;

  return {
    id: client.id || fallbackId,
    loyaltyId: client.loyaltyId || client.id || fallbackId,
    name: client.name || "",
    email: client.email || "",
    phone: client.phone || "",
    subscriptionId: client.subscriptionId || "",
    visits: Number(client.visits || 0),
    points: Number(client.points || 0),
    totalSpent: Number(client.totalSpent || 0),
    rewardsAvailable: Number(client.rewardsAvailable || 0),
    rewardGoal: Number(client.rewardGoal || 10),
    rewardNotified: Boolean(client.rewardNotified || false),
    segment: client.segment || "new",
    lastVisitAt: client.lastVisitAt || null,
    createdAt: client.createdAt || new Date().toISOString(),
    updatedAt: client.updatedAt || new Date().toISOString(),
  };
}

function computeSegment(client) {
  const visits = Number(client.visits || 0);
  const points = Number(client.points || 0);
  const totalSpent = Number(client.totalSpent || 0);

  if (points >= 20 || visits >= 10 || totalSpent >= 500) {
    return "vip";
  }

  if (points >= 8 || visits >= 4 || totalSpent >= 120) {
    return "loyal";
  }

  return "new";
}

function enrichClient(client) {
  const normalized = normalizeClient(client);
  const rewardGoal = Number(normalized.rewardGoal || 10);
  const rewardsAvailable = Math.floor(normalized.points / rewardGoal);

  return {
    ...normalized,
    rewardGoal,
    rewardsAvailable,
    segment: computeSegment(normalized),
  };
}

export async function getAllClients() {
  if (!isFirestoreReady) {
    console.log("⚠️ Mode local → clients local memory");
    return localClients.map((client) => enrichClient(client));
  }

  const collection = getCollection();
  const snapshot = await collection.get();

  return snapshot.docs.map((doc) =>
    enrichClient({
      id: doc.id,
      ...doc.data(),
    })
  );
}

export async function saveAllClients(clients = []) {
  const prepared = clients.map(enrichClient);
  const collection = getCollection();

  if (!collection) {
    localClients = prepared;
    return prepared;
  }

  const snapshot = await collection.get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  prepared.forEach((client) => {
    const ref = collection.doc(client.id);
    batch.set(ref, client);
  });

  await batch.commit();
  return prepared;
}

export async function upsertClient(clientData = {}) {
  const collection = getCollection();

  if (!collection) {
    const normalizedPhone = String(clientData.phone || "").trim();
    const normalizedEmail = String(clientData.email || "")
      .trim()
      .toLowerCase();

    const existingIndex = localClients.findIndex((client) => {
      const clientPhone = String(client.phone || "").trim();
      const clientEmail = String(client.email || "").trim().toLowerCase();

      return (
        (clientData.id && client.id === clientData.id) ||
        (normalizedPhone && clientPhone === normalizedPhone) ||
        (normalizedEmail && clientEmail === normalizedEmail)
      );
    });

    const fallbackId = clientData.id || `CL-${Date.now()}`;

    const base =
      existingIndex >= 0
        ? localClients[existingIndex]
        : {
            id: fallbackId,
            loyaltyId: clientData.loyaltyId || fallbackId,
            createdAt: new Date().toISOString(),
          };

    const updated = enrichClient({
      ...base,
      ...clientData,
      updatedAt: new Date().toISOString(),
    });

    if (existingIndex >= 0) {
      localClients[existingIndex] = updated;
    } else {
      localClients.push(updated);
    }

    return updated;
  }

  const allClients = await getAllClients();

  const normalizedPhone = String(clientData.phone || "").trim();
  const normalizedEmail = String(clientData.email || "")
    .trim()
    .toLowerCase();

  const existing = allClients.find((client) => {
    const clientPhone = String(client.phone || "").trim();
    const clientEmail = String(client.email || "").trim().toLowerCase();

    return (
      (clientData.id && client.id === clientData.id) ||
      (normalizedPhone && clientPhone === normalizedPhone) ||
      (normalizedEmail && clientEmail === normalizedEmail)
    );
  });

  const fallbackId = clientData.id || `CL-${Date.now()}`;

  const merged = enrichClient({
    ...(existing || {}),
    ...clientData,
    id: existing?.id || fallbackId,
    loyaltyId: existing?.loyaltyId || clientData.loyaltyId || fallbackId,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await collection.doc(merged.id).set(merged, { merge: true });

  return merged;
}

export async function refreshClientSegments() {
  const clients = await getAllClients();
  const refreshed = clients.map((client) => enrichClient(client));
  await saveAllClients(refreshed);
  return refreshed;
}