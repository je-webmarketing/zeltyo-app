function clean(value) {
  return String(value || "").trim();
}

function hasOneSignalConfig() {
  return Boolean(process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_API_KEY);
}

async function callOneSignal(payload) {
  if (!hasOneSignalConfig()) {
    console.warn("OneSignal non configuré");
    return { ok: false, error: "OneSignal non configuré" };
  }

  try {
    const response = await fetch("https://api.onesignal.com/notifications?c=push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${process.env.ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: process.env.ONESIGNAL_APP_ID,
        target_channel: "push",
        ...payload,
      }),
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      console.error("Erreur OneSignal :", response.status, data);
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (err) {
    console.error("Erreur appel OneSignal :", err);
    return {
      ok: false,
      error: err.message,
    };
  }
}

export function buildClientExternalId(businessId, clientId) {
  const cleanBusinessId = clean(businessId);
  const cleanClientId = clean(clientId);

  if (!cleanBusinessId || !cleanClientId) return "";

  return `${cleanBusinessId}_${cleanClientId}`;
}

export async function sendPush({ title, message, externalIds = [] }) {
  const validExternalIds = Array.isArray(externalIds)
    ? externalIds.map(clean).filter(Boolean)
    : [];

  if (validExternalIds.length === 0) {
    return {
      ok: false,
      error: "Aucun externalId fourni",
    };
  }

  return callOneSignal({
    include_aliases: {
      external_id: validExternalIds,
    },
    headings: {
      fr: title || "Zeltyo",
      en: title || "Zeltyo",
    },
    contents: {
      fr: message || "",
      en: message || "",
    },
  });
}

export async function sendPushToBusinessClients({
  title,
  message,
  businessId,
  clients = [],
}) {
  const externalIds = clients
    .filter((client) => clean(client.businessId) === clean(businessId))
    .map((client) => buildClientExternalId(businessId, client.id || client.loyaltyId))
    .filter(Boolean);

  if (externalIds.length === 0) {
    return {
      ok: false,
      error: "Aucun client ciblable pour ce commerce",
    };
  }

  return sendPush({
    title,
    message,
    externalIds,
  });
}

export async function sendNotificationToSubscription(subscriptionId, message) {
  const cleanSubscriptionId = clean(subscriptionId);

  if (!cleanSubscriptionId) {
    return {
      ok: false,
      error: "subscriptionId manquant",
    };
  }

  return callOneSignal({
    include_subscription_ids: [cleanSubscriptionId],
    headings: {
      fr: "Zeltyo",
      en: "Zeltyo",
    },
    contents: {
      fr: message || "",
      en: message || "",
    },
  });
}

export const sendPushNotification = sendPush;