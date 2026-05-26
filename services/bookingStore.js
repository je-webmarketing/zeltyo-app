import fs from "fs";
import path from "path";
import { db } from "./firebaseAdmin.js";

const COLLECTION_NAME = "bookings";
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "bookings.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

function readLocalBookings() {
  ensureDataFile();

  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

function writeLocalBookings(bookings) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2), "utf-8");
}

function getCollection() {
  if (!db) return null;
  return db.collection(COLLECTION_NAME);
}

function normalizeBooking(booking = {}) {
  const businessId =
    booking.businessId || booking.merchantId || booking.businessID || "";

  return {
    id: booking.id || `BK-${Date.now()}`,
    businessId,
    merchantId: booking.merchantId || businessId,
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
    items: Array.isArray(booking.items) ? booking.items : [],
    totalPrice: Number(booking.totalPrice || 0),

    status: booking.status || "pending",

    merchantResponse: booking.merchantResponse || "",
    proposedDate: booking.proposedDate || "",
    proposedTime: booking.proposedTime || "",
    responseAt: booking.responseAt || null,

    archived: booking.archived === true,
    archivedAt: booking.archivedAt || null,
    restoredAt: booking.restoredAt || null,

    createdAt: booking.createdAt || new Date().toISOString(),
    updatedAt: booking.updatedAt || new Date().toISOString(),
  };
}

export async function getAllBookings() {
  const collection = getCollection();

  if (!collection) {
    return readLocalBookings().map((booking) => normalizeBooking(booking));
  }

  const snapshot = await collection.get();

  return snapshot.docs.map((doc) =>
    normalizeBooking({
      id: doc.id,
      ...doc.data(),
    })
  );
}

export async function createBooking(bookingData = {}) {
  const now = new Date().toISOString();

  const booking = normalizeBooking({
    ...bookingData,
    id: bookingData.id || `BK-${Date.now()}`,
    status: bookingData.status || "pending",
    archived: false,
    archivedAt: null,
    restoredAt: null,
    createdAt: now,
    updatedAt: now,
  });

  const collection = getCollection();

  if (!collection) {
    const localBookings = readLocalBookings();
    localBookings.unshift(booking);
    writeLocalBookings(localBookings);
    return booking;
  }

  await collection.doc(booking.id).set(booking);
  return booking;
}

export async function getBookingsByBusinessId(businessId) {
  const targetId = String(businessId || "").trim();
  const allBookings = await getAllBookings();

  return allBookings
    .filter((booking) => {
      return (
        String(booking.businessId || "").trim() === targetId ||
        String(booking.merchantId || "").trim() === targetId
      );
    })
    .filter((booking) => booking.archived !== true)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getArchivedBookingsByBusinessId(businessId) {
  const targetId = String(businessId || "").trim();
  const allBookings = await getAllBookings();

  return allBookings
    .filter((booking) => {
      return (
        String(booking.businessId || "").trim() === targetId ||
        String(booking.merchantId || "").trim() === targetId
      );
    })
    .filter((booking) => booking.archived === true)
    .sort(
      (a, b) =>
        new Date(b.archivedAt || b.updatedAt || b.createdAt) -
        new Date(a.archivedAt || a.updatedAt || a.createdAt)
    );
}

export async function getBookingsByClientPhone(phone) {
  const targetPhone = String(phone || "").replace(/\D/g, "");
  const allBookings = await getAllBookings();

  return allBookings
    .filter((booking) => {
      const bookingPhone = String(booking.clientPhone || "").replace(/\D/g, "");
      return bookingPhone === targetPhone;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getBookingsByClientId(clientId) {
  const targetId = String(clientId || "").trim();
  const allBookings = await getAllBookings();

  return allBookings
    .filter((booking) => String(booking.clientId || "").trim() === targetId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getBookingById(bookingId) {
  const targetId = String(bookingId || "").trim();

  if (!targetId) return null;

  const allBookings = await getAllBookings();

  return (
    allBookings.find(
      (booking) =>
        String(booking.id || "").trim() === targetId
    ) || null
  );
}

export async function updateBookingStatus(bookingId, updates = {}) {
  const now = new Date().toISOString();
  const collection = getCollection();

  const buildUpdatedBooking = (currentBooking) => {
    const nextStatus = updates.status || currentBooking.status;

    const shouldArchive =
      updates.archived === true ||
      nextStatus === "cancelled" ||
      nextStatus === "completed";

    const shouldRestore = updates.archived === false;

    return normalizeBooking({
      ...currentBooking,

      status: nextStatus,

      merchantResponse:
        updates.merchantResponse ?? currentBooking.merchantResponse,
      proposedDate: updates.proposedDate ?? currentBooking.proposedDate,
      proposedTime: updates.proposedTime ?? currentBooking.proposedTime,

      responseAt: updates.responseAt ?? currentBooking.responseAt ?? now,

      archived: shouldRestore ? false : shouldArchive,
      archivedAt: shouldRestore
        ? null
        : shouldArchive
        ? updates.archivedAt || currentBooking.archivedAt || now
        : currentBooking.archivedAt || null,

      restoredAt: shouldRestore
        ? updates.restoredAt || now
        : currentBooking.restoredAt || null,

      updatedAt: updates.updatedAt || now,
    });
  };

  if (!collection) {
    const localBookings = readLocalBookings();

    const index = localBookings.findIndex(
      (booking) => booking.id === bookingId || booking._id === bookingId
    );

    if (index === -1) return null;

    const updated = buildUpdatedBooking(localBookings[index]);
    localBookings[index] = updated;

    writeLocalBookings(localBookings);
    return updated;
  }

  const ref = collection.doc(bookingId);
  const doc = await ref.get();

  if (!doc.exists) return null;

  const current = normalizeBooking({
    id: doc.id,
    ...doc.data(),
  });

  const updated = buildUpdatedBooking(current);

  await ref.set(updated, { merge: true });

  return updated;
}

export async function purgeOldBookings() {
  const allBookings = await getAllBookings();
  const now = Date.now();

  const filtered = allBookings.filter((booking) => {
    const referenceDate = booking.archivedAt || booking.updatedAt || booking.createdAt;

    const bookingTime = new Date(referenceDate).getTime();

    if (!bookingTime || Number.isNaN(bookingTime)) {
      return true;
    }

    const diffDays = (now - bookingTime) / (1000 * 60 * 60 * 24);

    if (booking.archived === true && diffDays > 30) {
      return false;
    }

    if (booking.status === "pending" && diffDays > 14) {
      return false;
    }

    return true;
  });

  const collection = getCollection();

  if (!collection) {
    writeLocalBookings(filtered);
    console.log(
      `🧹 Purge bookings : ${allBookings.length - filtered.length} supprimé(s)`
    );
    return;
  }

  const batch = db.batch();

  allBookings.forEach((booking) => {
    const exists = filtered.find((b) => b.id === booking.id);

    if (!exists) {
      batch.delete(collection.doc(booking.id));
    }
  });

  await batch.commit();

  console.log(
    `🧹 Purge Firestore : ${allBookings.length - filtered.length} supprimé(s)`
  );
}

export async function clearAllBookings() {
  const collection = getCollection();

  if (!collection) {
    writeLocalBookings([]);
    console.log("🧹 Toutes les réservations locales supprimées");
    return;
  }

  const snapshot = await collection.get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  console.log("🧹 Toutes les réservations Firestore supprimées");
}