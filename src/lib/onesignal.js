let oneSignalReadyPromise = null;

function waitForOneSignal(maxAttempts = 100, interval = 100) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      attempts += 1;

      if (window.OneSignal) {
        resolve(window.OneSignal);
        return;
      }

      if (attempts >= maxAttempts) {
        reject(new Error("OneSignal SDK non chargé"));
        return;
      }

      setTimeout(check, interval);
    };

    check();
  });
}

export function initOneSignal() {
  if (oneSignalReadyPromise) {
    return oneSignalReadyPromise;
  }

  oneSignalReadyPromise = (async () => {
    const OneSignal = await waitForOneSignal();

    await OneSignal.init({
      appId: "06b906e6-43ea-48bc-b430-6444533fb910",
      notifyButton: {
        enable: false,
      },
      serviceWorkerPath: "/OneSignalSDKWorker.js",
      serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js",
    });

    console.log("OneSignal initialisé ✅");

    return OneSignal;
  })();

  return oneSignalReadyPromise;
}

export async function getOneSignalStatus() {
  const OneSignal = await initOneSignal();

  return {
    permission: await OneSignal.Notifications.permission,
    optedIn: await OneSignal.User.PushSubscription.optedIn,
    subscriptionId: await OneSignal.User.PushSubscription.id,
    token: await OneSignal.User.PushSubscription.token,
  };
}

export async function enableOneSignalNotifications() {
  const OneSignal = await initOneSignal();

  await OneSignal.Notifications.requestPermission();

  return {
    permission: await OneSignal.Notifications.permission,
    optedIn: await OneSignal.User.PushSubscription.optedIn,
    subscriptionId: await OneSignal.User.PushSubscription.id,
    token: await OneSignal.User.PushSubscription.token,
  };
}