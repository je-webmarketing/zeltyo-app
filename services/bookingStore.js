import { db } from "./firebaseAdmin.js";


const bookingsCollection = db.collection("bookings");

export async function getAllBookings() {
  const snapshot = await bookingsCollection.get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function createBooking(bookingData) {
  const now = new Date().toISOString();

  const booking = {
    id: bookingData.id || `booking-${Math.random().toString(36).slice(2, 10)}`,
    businessId: bookingData.businessId || "",
    clientId: bookingData.clientId || "",
    clientName: bookingData.clientName || "",
    clientPhone: bookingData.clientPhone || "",
    type: bookingData.type || "reservation",
    area: bookingData.area || "interieur",
    partySize: Number(bookingData.partySize || 1),
    date: bookingData.date || "",
    time: bookingData.time || "",
    note: bookingData.note || "",
    status: bookingData.status || "pending",
    createdAt: now,
    updatedAt: now,
  };

  await bookingsCollection.doc(booking.id).set(booking, { merge: true });
  return booking;
}

export async function getBookingsByBusinessId(businessId) {
  const snapshot = await bookingsCollection.get();

  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter((booking) => booking.businessId === businessId);
}

export async function getBookingsByClientId(clientId) {
  const snapshot = await bookingsCollection.get();

  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter((booking) => booking.clientId === clientId);
}

export async function updateBookingStatus(id, status) {
  const ref = bookingsCollection.doc(id);
  const doc = await ref.get();

  if (!doc.exists) {
    return null;
  }

  const current = doc.data();

  const updated = {
    ...current,
    status,
    updatedAt: new Date().toISOString(),
  };

  await ref.set(updated, { merge: true });

  return {
    id,
    ...updated,
  };
}