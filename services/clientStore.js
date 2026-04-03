import { db } from "./firebaseAdmin.js";

const clientsCollection = db.collection("clients");

export async function getAllClients() {
  const snapshot = await clientsCollection.get();
  return snapshot.docs.map((doc) => ({
    ...doc.data(),
  }));
}

export async function saveAllClients(clients) {
  const batch = db.batch();

  for (const client of clients) {
    const docId = client.id || client.phone;
    if (!docId) continue;

    const ref = clientsCollection.doc(docId);
    batch.set(ref, {
      ...client,
      id: client.id || docId,
      updatedAt: new Date().toISOString(),
    });
  }

  await batch.commit();
  return clients;
}

export async function upsertClient(clientData) {
  const clients = await getAllClients();

  const existing = clients.find(
    (c) =>
      c.id === clientData.id ||
      (clientData.phone && c.phone === clientData.phone) ||
      (clientData.subscriptionId && c.subscriptionId === clientData.subscriptionId)
  );

  const now = new Date().toISOString();

  let client;

  if (existing) {
    client = {
      ...existing,
      ...clientData,
      updatedAt: now,
    };
  } else {
    const newId = clientData.id || clientData.phone || crypto.randomUUID();

    client = {
      id: newId,
      name: clientData.name || "",
      phone: clientData.phone || "",
      subscriptionId: clientData.subscriptionId || "",
      points: 0,
      rewardGoal: 10,
      visits: 0,
      totalSpent: 0,
      lastVisitAt: null,
      rewardNotified: false,
      createdAt: now,
      updatedAt: now,
      segment: "nouveau",
    };
  }

  await clientsCollection.doc(client.id).set(client, { merge: true });

  return await getAllClients();
}

function getSegment(client) {
  const visits = client.visits ?? 0;
  const totalSpent = client.totalSpent ?? 0;
  const lastVisitAt = client.lastVisitAt ? new Date(client.lastVisitAt) : null;

  let daysSinceLastVisit = 0;
  if (lastVisitAt) {
    daysSinceLastVisit = Math.floor(
      (Date.now() - lastVisitAt.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  if (daysSinceLastVisit >= 30 && visits > 0) {
    return "inactive";
  }

  if (visits >= 10 || totalSpent >= 200) {
    return "vip";
  }

  if (visits >= 3) {
    return "loyal";
  }

  return "nouveau";
}

export async function refreshClientSegments() {
  const clients = await getAllClients();

  const updatedClients = clients.map((client) => ({
    ...client,
    segment: getSegment(client),
    updatedAt: new Date().toISOString(),
  }));

  await saveAllClients(updatedClients);
  return updatedClients;
}