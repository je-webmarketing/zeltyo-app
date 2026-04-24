import { buildApiUrl } from "../config/api";

export async function getBookingsByBusiness(businessId) {
  const response = await fetch(
    buildApiUrl(`/bookings/by-business/${businessId}`)
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Erreur chargement réservations");
  }

  return data;
}

export async function updateBookingStatus(bookingId, status) {
  const response = await fetch(
    buildApiUrl(`/bookings/${bookingId}/status`),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Erreur mise à jour réservation");
  }

  return data;
}