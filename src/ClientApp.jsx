import { useMemo, useState, useEffect } from "react";
import {
  initOneSignal,
  getOneSignalStatus,
  enableOneSignalNotifications,
} from "./lib/onesignal";

export default function ClientApp() {
  const [selectedZone, setSelectedZone] = useState("Genève");
  const [selectedBusinessId, setSelectedBusinessId] = useState("BUS-1");
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const [oneSignalReady, setOneSignalReady] = useState(false);
  const [permission, setPermission] = useState(false);
  const [optedIn, setOptedIn] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootOneSignal() {
      try {
        const status = await getOneSignalStatus();

        if (!isMounted) return;

        setOneSignalReady(true);
        setPermission(Boolean(status.permission));
        setOptedIn(Boolean(status.optedIn));
        setSubscriptionId(status.subscriptionId || null);

        console.log("Permission OneSignal :", status.permission);
        console.log("OneSignal optedIn :", status.optedIn);
        console.log("OneSignal subscriptionId :", status.subscriptionId);
        console.log("OneSignal token :", status.token);
      } catch (error) {
        console.error("Erreur init OneSignal :", error);
      }
    }

    bootOneSignal();

    return () => {
      isMounted = false;
    };
  }, []);

  const zones = ["Genève", "Lausanne", "Lyon"];

  const businesses = [
    {
      id: "BUS-1",
      name: "Le Café du Centre",
      zone: "Genève",
      rewardGoal: 10,
      rewardLabel: "1 boisson offerte",
      points: 8,
      promo: "Petit-déjeuner -10%",
      color: "#0f766e",
    },
    {
      id: "BUS-2",
      name: "Barber Club",
      zone: "Lausanne",
      rewardGoal: 6,
      rewardLabel: "1 coupe -50%",
      points: 0,
      promo: "Soin barbe offert",
      color: "#1d4ed8",
    },
  ];

  const visibleBusinesses = useMemo(
    () => businesses.filter((b) => b.zone === selectedZone),
    [selectedZone]
  );

  const selectedBusiness =
    visibleBusinesses.find((b) => b.id === selectedBusinessId) ||
    visibleBusinesses[0];

  const progress = selectedBusiness
    ? (selectedBusiness.points / selectedBusiness.rewardGoal) * 100
    : 0;

  if (!selectedBusiness) return <div>Aucun commerce</div>;

  const handleEnableNotifications = async () => {
  try {
    await initOneSignal();
    const status = await enableOneSignalNotifications();

    console.log("Permission OneSignal :", status.permission);
    console.log("OneSignal optedIn :", status.optedIn);
    console.log("OneSignal subscriptionId :", status.subscriptionId);
    console.log("OneSignal token :", status.token);

    setOneSignalReady(true);
    setPermission(Boolean(status.permission));
    setOptedIn(Boolean(status.optedIn));
    setSubscriptionId(status.subscriptionId || null);

    if (status.subscriptionId) {
      console.log("Envoi au backend...");
      await saveClientSubscription(status.subscriptionId);
    }

    if (status.permission !== true) {
      alert("Notifications refusées");
      return;
    }

    alert("Notifications activées ✅");
  } catch (error) {
    console.error("Erreur OneSignal :", error);
    alert("Erreur lors de l’activation des notifications");
  }
};

  const saveClientSubscription = async (subscriptionId) => {
  try {
    const response = await fetch("https://zeltyo-app.onrender.com/clients/register-subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: "client-demo-1",
        name: "Julie",
        phone: "0600000000",
        subscriptionId,
      }),
    });

    const data = await response.json();
    console.log("Client sauvegardé :", data);
  } catch (error) {
    console.error("Erreur sauvegarde client :", error);
  }
};

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Zeltyo Client</h1>

      <select
        value={selectedZone}
        onChange={(e) => {
          setSelectedZone(e.target.value);
          setSelectedBusinessId("");
        }}
      >
        {zones.map((z) => (
          <option key={z}>{z}</option>
        ))}
      </select>

      <h2>{selectedBusiness.name}</h2>

      <div
        style={{
          background: selectedBusiness.color,
          color: "white",
          padding: 20,
          borderRadius: 12,
        }}
      >
        {selectedBusiness.points} / {selectedBusiness.rewardGoal} points
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ background: "#ddd", height: 10, borderRadius: 10 }}>
          <div
            style={{
              width: `${progress}%`,
              background: selectedBusiness.color,
              height: "100%",
            }}
          />
        </div>
      </div>

      <p>
        Récompense : <strong>{selectedBusiness.rewardLabel}</strong>
      </p>

      <h3>🎁 Promotion</h3>
      <div style={{ background: "#ecfdf5", padding: 15, borderRadius: 10 }}>
        {selectedBusiness.promo}
      </div>

      <h3 style={{ marginTop: 20 }}>Notifications utiles</h3>

      <button
        onClick={handleEnableNotifications}
        style={{
          padding: "12px",
          borderRadius: "12px",
          border: "none",
          background: "#0f766e",
          color: "white",
          fontWeight: "700",
          cursor: "pointer",
        }}
      >
        Activer les notifications
      </button>

      <button
        onClick={async () => {
          if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            setDeferredPrompt(null);
          } else {
            alert("Ajoutez l'application via votre navigateur 📲");
          }
        }}
        style={{ marginTop: 10, marginLeft: 10 }}
      >
        Installer l’application
      </button>

      <div style={{ marginTop: 20, fontSize: 14 }}>
        <div><strong>SDK prêt :</strong> {oneSignalReady ? "oui" : "non"}</div>
        <div><strong>Permission :</strong> {permission ? "oui" : "non"}</div>
        <div><strong>Opt-in :</strong> {optedIn ? "oui" : "non"}</div>
        <div><strong>Subscription ID :</strong> {subscriptionId || "aucun"}</div>
      </div>
    </div>
  );
}