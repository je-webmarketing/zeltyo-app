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

import {
  requireAuth,
  requireRole,
  requireBusinessAccess,
} from "../middleware/requireAuth.js";

console.log("✅ routes/bookings.js chargé");

const router = express.Router();

const ALLOWED_STATUSES = ["pending", "confirmed", "cancelled", "completed"];

function blockProduction(req, res, next) {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      ok: false,
      error: "Route désactivée en production",
    });
  }

  return next();
}

function normalizeText(value) {
  return String(value || "").trim();
}

function isSameBusiness(req, businessId) {
  return String(req.user?.businessId || "").trim() === String(businessId || "").trim();
}

router.get("/__debug", blockProduction, async (req, res) => {
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
      "/:id/propose-slot",
    ],
  });
});

router.get("/purge/old", requireAuth, requireRole("admin"), async (req, res) => {
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

router.get("/purge/all", requireAuth, requireRole("admin"), blockProduction, async (req, res) => {
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
    const businessId = normalizeText(
      req.body.businessId ||
        req.body.merchantId ||
        req.body.business?._id ||
        req.body.business?.id
    );

    const clientId = normalizeText(req.body.clientId);
    const clientName = normalizeText(req.body.clientName);
    const clientPhone = normalizeText(req.body.clientPhone);
    const type = normalizeText(req.body.type) || "reservation";
    const area = normalizeText(req.body.area) || "interieur";
    const partySize = Number(req.body.partySize || 1);
    const date = normalizeText(req.body.date);
    const time = normalizeText(req.body.time);
    const deliveryAddress = normalizeText(req.body.deliveryAddress);
    const note = normalizeText(req.body.note);
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const totalPrice = Number(req.body.totalPrice || 0);

    if (!businessId || !clientName || !clientPhone || !date || !time) {
      return res.status(400).json({
        ok: false,
        error: "businessId, clientName, clientPhone, date et time obligatoires",
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
      partySize: Number.isFinite(partySize) && partySize > 0 ? partySize : 1,
      date,
      time,
      deliveryAddress,
      note,
      items,
      totalPrice: Number.isFinite(totalPrice) ? totalPrice : 0,
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

router.get("/by-business/:id", requireAuth, async (req, res) => {
  try {
    const id = normalizeText(req.params.id);

    if (!isSameBusiness(req, id)) {
      return res.status(403).json({
        ok: false,
        error: "Accès interdit à ce commerce",
      });
    }

    const bookings = await getBookingsByBusinessId(id);

    return res.json({
      ok: true,
      bookings: Array.isArray(bookings)
        ? bookings.filter((booking) => booking.archived !== true)
        : [],
    });
  } catch (error) {
    console.error("Erreur GET /bookings/by-business/:id :", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur récupération réservations commerce",
    });
  }
});

router.get(
  "/archived/:businessId",
  requireAuth,
  requireBusinessAccess,
  async (req, res) => {
    try {
      const businessId = normalizeText(req.params.businessId);
      const allBookings = await getAllBookings();

      const bookings = allBookings
        .filter((booking) => {
          const bookingBusinessId = normalizeText(booking.businessId);
          const bookingMerchantId = normalizeText(booking.merchantId);

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
        error: "Erreur récupération archives",
      });
    }
  }
);

router.get("/by-client/:id", async (req, res) => {
  try {
    const clientId = normalizeText(req.params.id);
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
    const phone = normalizeText(req.params.phone).replace(/\D/g, "");
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

router.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const status = normalizeText(req.body.status);
    const merchantResponse = normalizeText(req.body.merchantResponse);
    const proposedDate = normalizeText(req.body.proposedDate);
    const proposedTime = normalizeText(req.body.proposedTime);

    if (!status) {
      return res.status(400).json({
        ok: false,
        error: "status obligatoire",
      });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        ok: false,
        error: "status invalide",
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

    if (!isSameBusiness(req, booking.businessId || booking.merchantId)) {
      return res.status(403).json({
        ok: false,
        error: "Action interdite sur ce commerce",
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

router.patch("/:id/restore", requireAuth, async (req, res) => {
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

    if (!isSameBusiness(req, booking.businessId || booking.merchantId)) {
      return res.status(403).json({
        ok: false,
        error: "Action interdite sur ce commerce",
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

router.patch("/:id/propose-slot", requireAuth, async (req, res) => {
  try {
    const proposedDate = normalizeText(req.body.proposedDate);
    const proposedTime = normalizeText(req.body.proposedTime);
    const merchantResponse = normalizeText(req.body.merchantResponse);

    const booking = await updateBookingStatus(req.params.id, {
      status: "confirmed",
      merchantResponse,
      proposedDate,
      proposedTime,
      archived: false,
      archivedAt: null,
      updatedAt: new Date().toISOString(),
      responseAt: new Date().toISOString(),
    });

    if (!booking) {
      return res.status(404).json({
        ok: false,
        error: "Réservation introuvable",
      });
    }

    if (!isSameBusiness(req, booking.businessId || booking.merchantId)) {
      return res.status(403).json({
        ok: false,
        error: "Action interdite sur ce commerce",
      });
    }

    return res.json({
      ok: true,
      message: "Nouveau créneau proposé",
      booking,
    });
  } catch (error) {
    console.error("Erreur PATCH /bookings/:id/propose-slot :", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur proposition créneau",
    });
  }
});

export default router;