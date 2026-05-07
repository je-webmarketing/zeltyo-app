import express from "express";
import {
  createBooking,
  getBookingsByBusinessId,
  getBookingsByClientId,
  getBookingsByClientPhone,
  updateBookingStatus,
  purgeOldBookings,
  clearAllBookings,
  getAllBookings,
} from "../services/bookingStore.js";

console.log("✅ routes/bookings.js chargé");

const router = express.Router();

const ALLOWED_STATUSES = ["pending", "confirmed", "cancelled", "completed"];

router.get("/__debug", async (req, res) => {
  return res.json({
    ok: true,
    message: "bookings router OK",
    routes: [
      "/",
      "/purge/old",
      "/purge/all",
      "/by-business/:id",
      "/by-client/:id",
      "/by-phone/:phone",
      "/archived/:businessId",
      "/:id/status",
      "/:id/restore",
    ],
  });
});

router.get("/purge/old", async (req, res) => {
  try {
    await purgeOldBookings();

    return res.json({
      ok: true,
      message: "Purge réservations effectuée",
    });
  } catch (error) {
    console.error("Erreur purge réservations :", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur purge réservations",
    });
  }
});

router.get("/purge/all", async (req, res) => {
  try {
    await clearAllBookings();

    return res.json({
      ok: true,
      message: "Toutes les réservations ont été supprimées",
    });
  } catch (error) {
    console.error("Erreur purge complète :", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur purge complète",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    console.log("📩 Payload réservation reçu :", req.body);

    const businessId =
      req.body.businessId ||
      req.body.merchantId ||
      req.body.business?._id ||
      req.body.business?.id ||
      "";

    const clientId = req.body.clientId || "";
    const clientName = String(req.body.clientName || "").trim();
    const clientPhone = String(req.body.clientPhone || "").trim();
    const type = req.body.type || "reservation";
    const area = req.body.area || "";
    const partySize = Number(req.body.partySize || 1);
    const date = req.body.date || "";
    const time = req.body.time || "";
    const deliveryAddress = req.body.deliveryAddress || "";
    const note = req.body.note || "";
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const totalPrice = Number(req.body.totalPrice || 0);

    if (!businessId || !clientName || !clientPhone || !date || !time) {
      return res.status(400).json({
        ok: false,
        error: "businessId, clientName, clientPhone, date et time obligatoires",
        received: {
          businessId,
          clientName,
          clientPhone,
          date,
          time,
        },
      });
    }

    const booking = await createBooking({
      businessId,
      merchantId: businessId,
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
      items,
      totalPrice,
      status: "pending",
      archived: false,
      archivedAt: null,
      restoredAt: null,
      merchantResponse: "",
      proposedDate: "",
      proposedTime: "",
      responseAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log("✅ Réservation créée :", booking);

    return res.status(201).json({
      ok: true,
      message: "Réservation envoyée",
      booking,
    });
  } catch (error) {
    console.error("Erreur POST /bookings :", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Erreur création réservation",
      stack: error.stack,
    });
  }
});

router.get("/by-business/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();

    console.log("👉 businessId reçu :", id);

    const bookings = await getBookingsByBusinessId(id);

    const activeBookings = Array.isArray(bookings)
      ? bookings.filter((booking) => booking.archived !== true)
      : [];

    console.log("📅 Réservations actives trouvées :", activeBookings.length);

    return res.json({
      ok: true,
      bookings: activeBookings,
    });
  } catch (error) {
    console.error("Erreur GET /bookings/by-business/:id :", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Erreur récupération réservations commerce",
    });
  }
});

router.get("/archived/:businessId", async (req, res) => {
  try {
    const businessId = String(req.params.businessId || "").trim();
    const allBookings = await getAllBookings();

    const bookings = allBookings
      .filter((booking) => {
        const bookingBusinessId = String(booking.businessId || "").trim();
        const bookingMerchantId = String(booking.merchantId || "").trim();

        return (
          (bookingBusinessId === businessId || bookingMerchantId === businessId) &&
          booking.archived === true
        );
      })
      .sort(
        (a, b) =>
          new Date(b.archivedAt || b.updatedAt || b.createdAt) -
          new Date(a.archivedAt || a.updatedAt || a.createdAt)
      );

    return res.json({
      ok: true,
      bookings,
    });
  } catch (error) {
    console.error("Erreur GET /bookings/archived/:businessId :", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Erreur récupération archives",
    });
  }
});

router.get("/by-client/:id", async (req, res) => {
  try {
    const clientId = String(req.params.id || "").trim();
    const bookings = await getBookingsByClientId(clientId);

    return res.json({
      ok: true,
      bookings: Array.isArray(bookings) ? bookings : [],
    });
  } catch (error) {
    console.error("Erreur GET /bookings/by-client/:id :", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur récupération réservations client",
    });
  }
});

router.get("/by-phone/:phone", async (req, res) => {
  try {
    const phone = String(req.params.phone || "").replace(/\D/g, "");
    const bookings = await getBookingsByClientPhone(phone);

    return res.json({
      ok: true,
      bookings: Array.isArray(bookings) ? bookings : [],
    });
  } catch (error) {
    console.error("Erreur GET /bookings/by-phone/:phone :", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur récupération réservations téléphone",
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
        error: "status invalide (pending, confirmed, cancelled, completed)",
      });
    }

    const shouldArchive = status === "cancelled" || status === "completed";

    const booking = await updateBookingStatus(req.params.id, {
      status,
      merchantResponse,
      proposedDate,
      proposedTime,
      archived: shouldArchive,
      archivedAt: shouldArchive ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
      responseAt: new Date().toISOString(),
    });

    if (!booking) {
      return res.status(404).json({
        ok: false,
        error: "Réservation introuvable",
      });
    }

    return res.json({
      ok: true,
      message: shouldArchive
        ? "Statut mis à jour et réservation archivée"
        : "Statut mis à jour",
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

router.patch("/:id/restore", async (req, res) => {
  try {
    const booking = await updateBookingStatus(req.params.id, {
      status: "pending",
      archived: false,
      archivedAt: null,
      restoredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (!booking) {
      return res.status(404).json({
        ok: false,
        error: "Réservation introuvable",
      });
    }

    return res.json({
      ok: true,
      message: "Réservation restaurée",
      booking,
    });
  } catch (error) {
    console.error("Erreur PATCH /bookings/:id/restore :", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur restauration réservation",
    });
  }
});

export default router;