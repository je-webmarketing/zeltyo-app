import { useMemo, useState } from "react";

const API_BASE = "http://zeltyo-app.onrender.com";

const COLORS = {
  bg: "#050505",
  surface: "#111111",
  border: "#2A2A2A",
  gold: "#D4AF37",
  goldLight: "#F2D06B",
  text: "#F7F4EA",
  textSoft: "#CFC7B0",
};

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  }, []);

  async function handleReset() {
    if (!token) {
      setMessage("Token manquant");
      return;
    }

    if (!password || !confirmPassword) {
      setMessage("Tous les champs sont obligatoires");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Les mots de passe ne correspondent pas");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(data.error || "Impossible de réinitialiser le mot de passe");
        return;
      }

      setMessage("Mot de passe mis à jour avec succès");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(error);
      setMessage("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #050505, #111111)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "Inter, Arial, sans-serif",
        color: COLORS.text,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: "28px",
          padding: "30px",
          boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "8px 14px",
            borderRadius: "999px",
            background: "rgba(212,175,55,0.12)",
            border: `1px solid ${COLORS.gold}`,
            marginBottom: "16px",
            fontSize: "13px",
            fontWeight: 700,
            color: COLORS.goldLight,
          }}
        >
          Réinitialisation sécurisée
        </div>

        <h1 style={{ marginTop: 0, marginBottom: 10, fontSize: "40px" }}>
          Nouveau mot de passe
        </h1>

        <p
          style={{
            color: COLORS.textSoft,
            lineHeight: 1.7,
            marginBottom: "18px",
          }}
        >
          Saisissez votre nouveau mot de passe pour accéder de nouveau à votre
          espace commerçant.
        </p>

        {message ? (
          <div
            style={{
              marginBottom: "14px",
              padding: "12px",
              borderRadius: "12px",
              background: "rgba(212,175,55,0.10)",
              border: `1px solid ${COLORS.border}`,
              color: COLORS.text,
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        ) : null}

        <input
          type="password"
          placeholder="Nouveau mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 14px",
            borderRadius: "14px",
            border: `1px solid ${COLORS.border}`,
            marginBottom: "12px",
            boxSizing: "border-box",
            fontSize: "15px",
            outline: "none",
            background: "#ffffff",
            color: "#111111",
          }}
        />

        <input
          type="password"
          placeholder="Confirmer le mot de passe"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 14px",
            borderRadius: "14px",
            border: `1px solid ${COLORS.border}`,
            marginBottom: "14px",
            boxSizing: "border-box",
            fontSize: "15px",
            outline: "none",
            background: "#ffffff",
            color: "#111111",
          }}
        />

        <button
          type="button"
          onClick={handleReset}
          disabled={loading}
          style={{
            width: "100%",
            border: "none",
            background: "linear-gradient(135deg, #D4AF37, #F2D06B)",
            color: "#111111",
            padding: "14px 16px",
            borderRadius: "14px",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 12px 24px rgba(212,175,55,0.20)",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
        </button>
      </div>
    </div>
  );
}