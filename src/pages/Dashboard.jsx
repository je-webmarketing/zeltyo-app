import { useEffect, useMemo, useState } from "react";

const API_BASE = "https://zeltyo-backend.onrender.com";

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [loadingCampaign, setLoadingCampaign] = useState(false);
  const [loadingVisitPhone, setLoadingVisitPhone] = useState(null);
  const [loadingRelaunchPhone, setLoadingRelaunchPhone] = useState(null);

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_BASE}/clients/segments`);
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      console.error("Erreur fetch clients:", err);
    }
  };

  useEffect(() => {
    fetchClients();
    const interval = setInterval(fetchClients, 5000);
    return () => clearInterval(interval);
  }, []);

  const count = (segment) =>
    clients.filter((c) => c.segment === segment).length;

  const getClientScore = (client) => {
    return (client.visits || 0) * 10 + (client.totalSpent || 0);
  };

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => getClientScore(b) - getClientScore(a));
  }, [clients]);

  const formatDaysAgo = (date) => {
    if (!date) return "-";

    const diff =
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);

    const days = Math.floor(diff);

    if (days <= 0) return "Aujourd’hui";
    if (days === 1) return "Hier";

    return `Il y a ${days} jours`;
  };

  const getDaysSinceLastVisit = (date) => {
    if (!date) return null;
    return Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  const getUrgency = (date) => {
    const days = getDaysSinceLastVisit(date);

    if (days === null) {
      return { label: "Aucune visite", color: "#6b7280", bg: "#f3f4f6" };
    }

    if (days <= 2) {
      return { label: "🟢 Récent", color: "#166534", bg: "#dcfce7" };
    }

    if (days <= 6) {
      return { label: "🟡 À surveiller", color: "#92400e", bg: "#fef3c7" };
    }

    return { label: "🔴 Urgent", color: "#991b1b", bg: "#fee2e2" };
  };

  const getInactiveClients = () => {
    return clients
      .filter((c) => {
        const days = getDaysSinceLastVisit(c.lastVisitAt);
        return days !== null && days >= 7;
      })
      .sort((a, b) => getClientScore(b) - getClientScore(a));
  };

  const isTopClient = (client) => {
    const maxScore = Math.max(...clients.map(getClientScore), 0);
    return getClientScore(client) === maxScore && maxScore > 0;
  };

  const isAtRisk = (client) => {
    const days = getDaysSinceLastVisit(client.lastVisitAt);
    return days !== null && days >= 7;
  };

  const getSuggestion = () => {
    if (!clients.length) return null;

    const atRiskClients = clients
      .filter((c) => {
        const days = getDaysSinceLastVisit(c.lastVisitAt);
        return days !== null && days >= 7;
      })
      .sort((a, b) => getClientScore(b) - getClientScore(a));

    if (atRiskClients.length > 0) {
      return {
        type: "relaunch",
        client: atRiskClients[0],
      };
    }

    const topClient = [...clients].sort(
      (a, b) => getClientScore(b) - getClientScore(a)
    )[0];

    if (!topClient) return null;

    return {
      type: "reward",
      client: topClient,
    };
  };

  const suggestion = getSuggestion();
  const inactiveClients = getInactiveClients();
  const urgentCount = inactiveClients.length;

  const addVisit = async (phone) => {
    try {
      setLoadingVisitPhone(phone);

      await fetch(`${API_BASE}/clients/visit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          amount: 20,
          points: 1,
        }),
      });

      await fetchClients();
    } catch (err) {
      console.error("Erreur ajout visite:", err);
      alert("Erreur ajout visite");
    } finally {
      setLoadingVisitPhone(null);
    }
  };

  const relaunchClient = async (phone) => {
    try {
      setLoadingRelaunchPhone(phone);

      await fetch(`${API_BASE}/clients/relaunch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      alert("Relance envoyée");
      await fetchClients();
    } catch (err) {
      console.error("Erreur relance client:", err);
      alert("Erreur relance client");
    } finally {
      setLoadingRelaunchPhone(null);
    }
  };

  const runCampaign = async (type) => {
    try {
      setLoadingCampaign(true);

      await fetch(`${API_BASE}/automation-segmented/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type }),
      });

      alert("Campagne envoyée");
      await fetchClients();
    } catch (err) {
      console.error("Erreur campagne:", err);
      alert("Erreur campagne");
    } finally {
      setLoadingCampaign(false);
    }
  };

 const sendTestNotification = async () => {
  try {
    await fetch(`${API_BASE}/notifications/test`, {
      method: "POST",
    });

    alert("Notification envoyée !");
  } catch (err) {
    console.error(err);
    alert("Erreur envoi notification");
  }
}; 

const runAutomation = async (type) => {
  try {
    const res = await fetch(`${API_BASE}/automation-segmented/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type }),
    });

    const data = await res.json();
    console.log("Résultat automation :", data);

    alert("Notifications envoyées ✅");
  } catch (err) {
    console.error(err);
    alert("Erreur automation ❌");
  }
};

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "Arial, sans-serif",
        background: "#f8fafc",
        minHeight: "100vh",
        color: "#111827",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 8 }}>Zeltyo Dashboard</h1>
        <p style={{ margin: 0, color: "#4b5563" }}>
          Vue simple pour piloter la fidélité, les relances et les meilleurs clients.
        </p>
      </div>

      {suggestion && (
        <div
          style={{
            background: "#fef3c7",
            padding: 16,
            borderRadius: 12,
            marginBottom: 20,
            border: "1px solid #f59e0b",
          }}
        >
          {suggestion.type === "relaunch" && (
            <div>
              💡 Suggestion du jour : relancer{" "}
              <strong>{suggestion.client.name}</strong>
            </div>
          )}

          {suggestion.type === "reward" && (
            <div>
              💡 Suggestion du jour : valoriser{" "}
              <strong>{suggestion.client.name}</strong>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ marginBottom: 12, fontWeight: "bold" }}>
          Actions marketing
        </div>

        <button onClick={sendTestNotification}>
  🔔 Notification test
</button>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
         <button onClick={() => runAutomation("inactive")}>
  Relancer inactifs
</button>

<button onClick={() => runAutomation("loyal")}>
  Booster fidélité
</button>

<button onClick={() => runAutomation("vip")}>
  Récompenser VIP
</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <Card title="Nouveaux" value={count("nouveau")} />
        <Card title="Fidèles" value={count("loyal")} />
        <Card title="VIP" value={count("vip")} />
        <Card title="Inactifs" value={count("inactive")} />
        <Card title="Urgents" value={urgentCount} />
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          border: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ marginTop: 0 }}>À relancer aujourd’hui</h2>

        {inactiveClients.length === 0 ? (
          <p style={{ marginBottom: 0 }}>Aucun client à relancer 👍</p>
        ) : (
          <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
            {inactiveClients.map((c) => (
              <li key={c.id} style={{ marginBottom: 10 }}>
                <strong>{c.name}</strong> ({c.phone}) — {formatDaysAgo(c.lastVisitAt)}{" "}
                <button
                  onClick={() => relaunchClient(c.phone)}
                  disabled={loadingRelaunchPhone === c.phone}
                  style={{ ...smallButtonStyle("#b91c1c"), marginLeft: 10 }}
                >
                  {loadingRelaunchPhone === c.phone
                    ? "Envoi..."
                    : "Relancer ce client"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 16,
          border: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Clients</h2>

        <div style={{ overflowX: "auto" }}>
          <table
            border="1"
            cellPadding="10"
            style={{
              borderCollapse: "collapse",
              width: "100%",
              background: "white",
            }}
          >
            <thead style={{ background: "#f3f4f6" }}>
              <tr>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>Visites</th>
                <th>Points</th>
                <th>Segment</th>
                <th>Dernière visite</th>
                <th>Urgence</th>
                <th>Dépenses</th>
                <th>Score</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedClients.map((c) => {
                const urgency = getUrgency(c.lastVisitAt);

                return (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{c.visits}</td>
                    <td>{c.points}</td>
                    <td>{c.segment}</td>
                    <td>{formatDaysAgo(c.lastVisitAt)}</td>
                    <td>
                      <span
                        style={{
                          background: urgency.bg,
                          color: urgency.color,
                          padding: "4px 8px",
                          borderRadius: 999,
                          fontWeight: "bold",
                          fontSize: 12,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {urgency.label}
                      </span>
                    </td>
                    <td>{c.totalSpent ?? 0} €</td>
                    <td>{getClientScore(c)}</td>
                    <td>
                      {isTopClient(c) && (
                        <span style={{ color: "#b45309", fontWeight: "bold" }}>
                          🏆 Top client
                        </span>
                      )}
                      {isAtRisk(c) && (
                        <span
                          style={{
                            color: "#b91c1c",
                            fontWeight: "bold",
                            marginLeft: isTopClient(c) ? 8 : 0,
                          }}
                        >
                          ⚠️ À relancer
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => addVisit(c.phone)}
                        disabled={loadingVisitPhone === c.phone}
                        style={smallButtonStyle("#1e7f74")}
                      >
                        {loadingVisitPhone === c.phone ? "Ajout..." : "+ visite"}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {sortedClients.length === 0 && (
                <tr>
                  <td colSpan="11" style={{ textAlign: "center", padding: 20 }}>
                    Aucun client pour le moment
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div
      style={{
        padding: 18,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        width: 160,
        textAlign: "center",
        background: "white",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>{title}</h3>
      <p style={{ fontSize: 28, margin: 0, fontWeight: "bold" }}>{value}</p>
    </div>
  );
}

function buttonStyle(background) {
  return {
    background,
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
  };
}

function smallButtonStyle(background) {
  return {
    background,
    color: "white",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
  };
}