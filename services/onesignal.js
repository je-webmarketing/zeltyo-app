export async function sendPush({ title, message, externalIds }) {
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
        include_aliases: {
          external_id: externalIds,
        },
        headings: { fr: title, en: title },
        contents: { fr: message, en: message },
      }),
    });

    const data = await response.json();

    console.log("sendPush → status:", response.status);
    console.log("sendPush → response:", JSON.stringify(data, null, 2));

    return { ok: response.ok, status: response.status, data };
  } catch (err) {
    console.error("Erreur sendPush :", err);
    return { ok: false, error: err.message };
  }
}

export async function sendNotificationToSubscription(subscriptionId, message) {
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
        include_subscription_ids: [subscriptionId],
        headings: { fr: "Zeltyo", en: "Zeltyo" },
        contents: { fr: message, en: message },
      }),
    });

    const data = await response.json();

    console.log("sendNotificationToSubscription → status:", response.status);
    console.log(
      "sendNotificationToSubscription → response:",
      JSON.stringify(data, null, 2)
    );

    return { ok: response.ok, status: response.status, data };
  } catch (err) {
    console.error("Erreur sendNotificationToSubscription :", err);
    return { ok: false, error: err.message };
  }
}