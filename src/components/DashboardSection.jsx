import { useMemo } from "react";

const COLORS = {
  surface: "#111111",
  surfaceSoft: "#161616",
  border: "#2A2A2A",
  gold: "#D4AF37",
  goldLight: "#F2D06B",
  text: "#F7F4EA",
  textSoft: "#CFC7B0",
  warning: "#f59e0b",
};

function StatCard({ label, value }) {
  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 20,
        padding: 20,
      }}
    >
      <div style={{ color: COLORS.textSoft, fontSize: 14, marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ color: COLORS.goldLight, fontSize: 32, fontWeight: 900 }}>
        {value}
      </div>
    </div>
  );
}

export default function DashboardSection({
  clients = [],
  promotions = [],
  bookings = [],
  businessId = "",
}) {
  const analytics = useMemo(() => {
    const safeClients = Array.isArray(clients) ? clients : [];
    const safePromotions = Array.isArray(promotions) ? promotions : [];
    const safeBookings = Array.isArray(bookings) ? bookings : [];

    const businessClients = safeClients.filter(
      (c) => !businessId || String(c.businessId || "") === String(businessId)
    );

    const businessPromotions = safePromotions.filter(
      (p) => !businessId || String(p.businessId || "") === String(businessId)
    );

    const businessBookings = safeBookings.filter(
      (b) =>
        !businessId ||
        String(b.businessId || b.merchantId || "") === String(businessId)
    );

    const totalClients = businessClients.length;

    const totalPoints = businessClients.reduce(
      (sum, client) => sum + Number(client.points || 0),
      0
    );

    const totalVisits = businessClients.reduce(
      (sum, client) => sum + Number(client.visits || 0),
      0
    );

    const activePromotions = businessPromotions.filter((promo) => {
      const status = String(promo.status || "").toLowerCase();
      return status === "active" || status === "actif" || status === "";
    }).length;

    const today = new Date().toISOString().slice(0, 10);

    const todayBookings = businessBookings.filter((booking) => {
      const bookingDate = String(
        booking.date || booking.bookingDate || booking.createdAt || ""
      ).slice(0, 10);

      return bookingDate === today;
    }).length;

    const estimatedRevenue =
      businessBookings.reduce((sum, booking) => {
        return sum + Number(booking.totalPrice || booking.amount || 0);
      }, 0) || totalVisits * 12;

    const topClients = [...businessClients]
      .sort((a, b) => Number(b.points || 0) - Number(a.points || 0))
      .slice(0, 5);

    const inactiveClients = businessClients.filter((client) => {
      const lastVisit = client.lastVisitAt || client.updatedAt || client.createdAt;

      if (!lastVisit) return true;

      const lastDate = new Date(lastVisit);
      if (Number.isNaN(lastDate.getTime())) return false;

      const diffDays = (Date.now() - lastDate.getTime()) / 86400000;
      return diffDays >= 30;
    });

    return {
      totalClients,
      totalPoints,
      totalVisits,
      activePromotions,
      todayBookings,
      estimatedRevenue,
      topClients,
      inactiveClients,
    };
  }, [clients, promotions, bookings, businessId]);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 16,
        }}
      >
        <StatCard label="Clients actifs" value={analytics.totalClients} />
        <StatCard label="Points cumulés" value={analytics.totalPoints} />
        <StatCard label="Visites" value={analytics.totalVisits} />
        <StatCard label="Promos actives" value={analytics.activePromotions} />
        <StatCard label="Réservations du jour" value={analytics.todayBookings} />
        <StatCard
          label="CA estimé"
          value={`${Number(analytics.estimatedRevenue || 0).toFixed(0)} €`}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
        }}
      >
        <div
          style={{
            background: COLORS.surfaceSoft,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 24,
            padding: 22,
          }}
        >
          <h2 style={{ color: COLORS.goldLight, marginTop: 0 }}>
            Top clients fidélité
          </h2>

          {analytics.topClients.length === 0 ? (
            <p style={{ color: COLORS.textSoft }}>Aucun client pour le moment.</p>
          ) : (
            analytics.topClients.map((client) => (
              <div
                key={client.id}
                style={{
                  padding: "14px 0",
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                <div style={{ color: COLORS.text, fontWeight: 800 }}>
                  {client.name || "Client"}
                </div>
                <div style={{ color: COLORS.textSoft }}>
                  {Number(client.points || 0)} points •{" "}
                  {Number(client.visits || 0)} visites
                </div>
              </div>
            ))
          )}
        </div>

        <div
          style={{
            background: COLORS.surfaceSoft,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 24,
            padding: 22,
          }}
        >
          <h2 style={{ color: COLORS.warning, marginTop: 0 }}>
            Clients inactifs
          </h2>

          {analytics.inactiveClients.length === 0 ? (
            <p style={{ color: COLORS.textSoft }}>Aucun client inactif.</p>
          ) : (
            analytics.inactiveClients.slice(0, 5).map((client) => (
              <div
                key={client.id}
                style={{
                  padding: "14px 0",
                  borderBottom: `1px solid ${COLORS.border}`,
                }}
              >
                <div style={{ color: COLORS.text, fontWeight: 800 }}>
                  {client.name || "Client"}
                </div>
                <div style={{ color: COLORS.textSoft }}>
                  Dernière activité :{" "}
                  {client.lastVisitAt
                    ? new Date(client.lastVisitAt).toLocaleDateString("fr-FR")
                    : "Non renseignée"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}