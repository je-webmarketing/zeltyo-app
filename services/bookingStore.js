import { db } from "./firebaseAdmin.js";

const isFirestoreReady = !!db;
const COLLECTION_NAME = "bookings";

let localBookings = [];

function getCollection() {
  if (!db) return null;
  return db.collection(COLLECTION_NAME);
}

function normalizeBooking(booking = {}) {
  return {
    id: booking.id || `BK-${Date.now()}`,
    businessId: booking.businessId || "",
    clientId: booking.clientId || "",
    clientName: booking.clientName || "",
    clientPhone: booking.clientPhone || "",
    type: booking.type || "reservation",
    area: booking.area || "interieur",
    partySize: Number(booking.partySize || 1),
    date: booking.date || "",
    time: booking.time || "",
    note: booking.note || "",
    deliveryAddress: booking.deliveryAddress || "",
    status: booking.status || "pending",
    merchantResponse: booking.merchantResponse || "",
    proposedDate: booking.proposedDate || "",
    proposedTime: booking.proposedTime || "",
    responseAt: booking.responseAt || null,
    createdAt: booking.createdAt || new Date().toISOString(),
    updatedAt: booking.updatedAt || new Date().toISOString(),
  };
}

export async function getAllBookings() {
  if (!isFirestoreReady) {
    console.log("⚠️ Mode local → bookings local memory");
    return localBookings.map((booking) => normalizeBooking(booking));
  }

  const collection = getCollection();
  const snapshot = await collection.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function createBooking(bookingData = {}) {
  const booking = normalizeBooking({
    ...bookingData,
    id: bookingData.id || `BK-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const collection = getCollection();

  if (!collection) {
    localBookings.unshift(booking);
    return booking;
  }

  await collection.doc(booking.id).set(booking);
  return booking;
}

export async function getBookingsByBusinessId(businessId) {
  const allBookings = await getAllBookings();

  return allBookings
    .filter((booking) => booking.businessId === businessId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getBookingsByClientId(clientId) {
  const allBookings = await getAllBookings();

  return allBookings
    .filter((booking) => booking.clientId === clientId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function updateBookingStatus(bookingId, updates = {}) {
  const collection = getCollection();

  if (!collection) {
    const index = localBookings.findIndex((booking) => booking.id === bookingId);

    if (index === -1) {
      return null;
    }

    localBookings[index] = normalizeBooking({
      ...localBookings[index],
      status: updates.status || localBookings[index].status,
      merchantResponse:
        updates.merchantResponse ?? localBookings[index].merchantResponse,
      proposedDate: updates.proposedDate ?? localBookings[index].proposedDate,
      proposedTime: updates.proposedTime ?? localBookings[index].proposedTime,
      responseAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return localBookings[index];
  }

  const ref = collection.doc(bookingId);
  const doc = await ref.get();

  if (!doc.exists) {
    return null;
  }

  const current = {
    id: doc.id,
    ...doc.data(),
  };

  const updated = normalizeBooking({
    ...current,
    status: updates.status || current.status,
    merchantResponse: updates.merchantResponse ?? current.merchantResponse,
    proposedDate: updates.proposedDate ?? current.proposedDate,
    proposedTime: updates.proposedTime ?? current.proposedTime,
    responseAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await ref.set(updated, { merge: true });

  return updated;
}