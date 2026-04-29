import express from "express";
import {
  createBooking,
  getBookingsByBusinessId,
  getBookingsByClientId,
  updateBookingStatus,
} from "../services/bookingStore.js";

console.log("✅ routes/bookings.js chargé");

const router = express.Router();

const ALLOWED_STATUSES = ["pending", "confirmed", "cancelled"];

router.get("/__debug", async (req, res) => {
  return res.json({
    ok: true,
    message: "bookings router OK",
    routes: [
      "/",
      "/by-business/:id",
      "/by-client/:id",
      "/:id/status",
    ],
  });
});

router.post("/", async (req, res) => {
  try {
      const {
  businessId,
  clientId,
  clientName,
  clientPhone,
  type,
  area,
  partySize,
  date,
  time,
  deliveryAddress,
  note,
  items = [],
  totalPrice = 0,
} = req.body;

    if (!businessId || !clientName || !clientPhone || !date || !time) {
      return res.status(400).json({
        ok: false,
        error: "businessId, clientName, clientPhone, date et time obligatoires",
      });
    }

  const booking = await createBooking({
  businessId,
  clientId: clientId || "",
  clientName,
  clientPhone,
  type: type || "reservation",
  area: area || "",
  partySize: Number(partySize || 1),
  date,
  time,
  deliveryAddress: deliveryAddress || "",
  note: note || "",
  items: Array.isArray(items) ? items : [],
  totalPrice: Number(totalPrice || 0),
  status: "pending",
  merchantResponse: "",
  proposedDate: "",
  proposedTime: "",
  responseAt: null,
});

    return res.status(201).json({
      ok: true,
      message: "Réservation envoyée",
      booking,
    });
  } catch (error) {
    console.error("Erreur POST /bookings :", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur création réservation",
    });
  }
});

router.get("/by-business/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log("👉 businessId reçu :", id);

    const bookings = await getBookingsByBusinessId(id);

    return res.json({
      ok: true,
      bookings,
    });
  } catch (error) {
    console.error("Erreur GET /bookings/by-business/:id :", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Erreur récupération réservations commerce",
    });
  }
});

router.get("/by-client/:id", async (req, res) => {
  try {
    const bookings = await getBookingsByClientId(req.params.id);

    return res.json({
      ok: true,
      bookings,
    });
  } catch (error) {
    console.error("Erreur GET /bookings/by-client/:id :", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur récupération réservations client",
    });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const {
      status,
      merchantResponse = "",
      proposedDate = "",
      proposedTime = "",
    } = req.body;

    if (!status) {
      return res.status(400).json({
        ok: false,
        error: "status obligatoire",
      });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        ok: false,
        error: "status invalide (pending, confirmed, cancelled)",
      });
    }

    const booking = await updateBookingStatus(req.params.id, {
      status,
      merchantResponse,
      proposedDate,
      proposedTime,
    });

    if (!booking) {
      return res.status(404).json({
        ok: false,
        error: "Réservation introuvable",
      });
    }

    return res.json({
      ok: true,
      message: "Statut mis à jour",
      booking,
    });
  } catch (error) {
    console.error("Erreur PATCH /bookings/:id/status :", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur mise à jour statut",
    });
  }
});

export default router;