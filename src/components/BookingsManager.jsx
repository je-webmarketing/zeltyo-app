import { useEffect, useMemo, useState } from "react";
import {
  getBookingsByBusiness,
  updateBookingStatus,
} from "../lib/bookingsApi";

const COLORS = {
  bg: "#050505",
  surface: "#111111",
  surfaceSoft: "#181818",
  border: "#2A2A2A",
  gold: "#D4AF37",
  goldLight: "#F2D06B",
  text: "#F7F4EA",
  textSoft: "#CFC7B0",
  success: "#22c55e",
  danger: "#ef4444",
  warning: "#f59e0b",
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getStatusMeta(status) {
  switch (status) {
    case "confirmed":
      return {
        label: "Confirmée",
        color: COLORS.success,
        bg: "rgba(34, 197, 94, 0.12)",
      };
    case "cancelled":
      return {
        label: "Refusée",
        color: COLORS.danger,
        bg: "rgba(239, 68, 68, 0.12)",
      };
    case "pending":
    default:
      return {
        label: "En attente",
        color: COLORS.warning,
        bg: "rgba(245, 158, 11, 0.12)",
      };
  }
}

function InfoBlock({ label, value }) {
  return (
    <div
      style={{
        background: "#0d0d0d",
        border: "1px solid #242424",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#a8a08d",
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          color: "#f7f4ea",
          fontWeight: 600,
        }}
      >
        {value || "-"}
      </div>
    </div>
  );
}

export default function BookingsManager({
  businessId = "BUS-DYNAMIC",
  title = "Réservations",
}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionId, setActionId] = useState("");
  const [filter, setFilter] = useState("all");

  async function loadBookings() {
    try {
      setLoading(true);
      setError("");

      const data = await getBookingsByBusiness(businessId);
      setBookings(Array.isArray(data?.bookings) ? data.bookings : []);
    } catch (err) {
      setError(err.message || "Impossible de charger les réservations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, [businessId]);

  const filteredBookings = useMemo(() => {
    const sorted = [...bookings].sort((a, b) => {
      const aDate = `${a.date || ""}T${a.time || "00:00"}`;
      const bDate = `${b.date || ""}T${b.time || "00:00"}`;
      return new Date(aDate) - new Date(bDate);
    });

    if (filter === "all") return sorted;
    return sorted.filter((item) => item.status === filter);
  }, [bookings, filter]);

  const stats = useMemo(() => {
    return {
      all: bookings.length,
      pending: bookings.filter((b) => b.status === "pending").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    };
  }, [bookings]);

  async function handleStatusChange(bookingId, status) {
    try {
      setActionId(bookingId);
      setError("");
      setSuccess("");

      const data = await updateBookingStatus(bookingId, status);
      const updatedBooking = data?.booking;

      setBookings((prev) =>
        prev.map((item) => (item.id === bookingId ? updatedBooking : item))
      );

      setSuccess(
        status === "confirmed"
          ? "Réservation acceptée avec succès."
          : "Réservation refusée."
      );
    } catch (err) {
      setError(err.message || "Erreur lors de la mise à jour du statut");
    } finally {
      setActionId("");
    }
  }

  return (
    <section
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 18,
        padding: 20,
        color: COLORS.text,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: COLORS.goldLight,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              margin: "6px 0 0",
              color: COLORS.textSoft,
              fontSize: 14,
            }}
          >
            Gérez les demandes de réservation de votre établissement.
          </p>
        </div>

        <button
          onClick={loadBookings}
          style={{
            background: "transparent",
            border: `1px solid ${COLORS.gold}`,
            color: COLORS.goldLight,
            borderRadius: 10,
            padding: "10px 14px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Actualiser
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <FilterButton
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label={`Toutes (${stats.all})`}
        />
        <FilterButton
          active={filter === "pending"}
          onClick={() => setFilter("pending")}
          label={`En attente (${stats.pending})`}
        />
        <FilterButton
          active={filter === "confirmed"}
          onClick={() => setFilter("confirmed")}
          label={`Confirmées (${stats.confirmed})`}
        />
        <FilterButton
          active={filter === "cancelled"}
          onClick={() => setFilter("cancelled")}
          label={`Refusées (${stats.cancelled})`}
        />
      </div>

      {error ? (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 12,
            background: "rgba(239, 68, 68, 0.10)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            color: "#fecaca",
          }}
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 12,
            background: "rgba(34, 197, 94, 0.10)",
            border: "1px solid rgba(34, 197, 94, 0.25)",
            color: "#bbf7d0",
          }}
        >
          {success}
        </div>
      ) : null}

      {loading ? (
        <div
          style={{
            padding: 20,
            borderRadius: 14,
            background: COLORS.surfaceSoft,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.textSoft,
          }}
        >
          Chargement des réservations...
        </div>
      ) : filteredBookings.length === 0 ? (
        <div
          style={{
            padding: 20,
            borderRadius: 14,
            background: COLORS.surfaceSoft,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.textSoft,
          }}
        >
          Aucune réservation trouvée.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {filteredBookings.map((booking) => {
            const statusMeta = getStatusMeta(booking.status);
            const isPending = booking.status === "pending";
            const isBusy = actionId === booking.id;

            return (
              <article
                key={booking.id}
                style={{
                  background: COLORS.surfaceSoft,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: COLORS.text,
                        marginBottom: 6,
                      }}
                    >
                      {booking.clientName || "Client sans nom"}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: COLORS.textSoft,
                      }}
                    >
                      {booking.clientPhone || "Téléphone non renseigné"}
                    </div>
                  </div>

                  <div
                    style={{
                      alignSelf: "flex-start",
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: statusMeta.bg,
                      border: `1px solid ${statusMeta.color}`,
                      color: statusMeta.color,
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {statusMeta.label}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <InfoBlock label="Date" value={formatDate(booking.date)} />
                  <InfoBlock label="Heure" value={booking.time} />
                  <InfoBlock
                    label="Nombre de personnes"
                    value={String(booking.partySize || 1)}
                  />
                  <InfoBlock label="Zone" value={booking.area || "interieur"} />
                  <InfoBlock label="Type" value={booking.type || "reservation"} />
                  <InfoBlock label="Note" value={booking.note || "-"} />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => handleStatusChange(booking.id, "confirmed")}
                    disabled={!isPending || isBusy}
                    style={{
                      background: isPending ? COLORS.success : "#2b2b2b",
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 14px",
                      cursor: !isPending || isBusy ? "not-allowed" : "pointer",
                      fontWeight: 700,
                      opacity: !isPending || isBusy ? 0.7 : 1,
                    }}
                  >
                    {isBusy ? "Traitement..." : "✅ Accepter"}
                  </button>

                  <button
                    onClick={() => handleStatusChange(booking.id, "cancelled")}
                    disabled={!isPending || isBusy}
                    style={{
                      background: isPending ? COLORS.danger : "#2b2b2b",
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 14px",
                      cursor: !isPending || isBusy ? "not-allowed" : "pointer",
                      fontWeight: 700,
                      opacity: !isPending || isBusy ? 0.7 : 1,
                    }}
                  >
                    {isBusy ? "Traitement..." : "❌ Refuser"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FilterButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "rgba(212, 175, 55, 0.14)" : "transparent",
        color: active ? "#F2D06B" : "#CFC7B0",
        border: active ? "1px solid #D4AF37" : "1px solid #2A2A2A",
        borderRadius: 999,
        padding: "9px 14px",
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  );
}