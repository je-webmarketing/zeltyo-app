import dotenv from "dotenv";
dotenv.config();

import admin from "firebase-admin";

let db = null;

function getServiceAccount() {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!jsonEnv) {
    console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_JSON manquant");
    return null;
  }

  try {
    return JSON.parse(jsonEnv);
  } catch (error) {
    console.error("❌ FIREBASE_SERVICE_ACCOUNT_JSON invalide :", error.message);
    return null;
  }
}

const serviceAccount = getServiceAccount();

if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  db = admin.firestore();

  console.log("✅ Firebase chargé depuis variable Render");
  console.log("FIREBASE PROJECT ID =", serviceAccount.project_id);
  console.log("FIREBASE CLIENT EMAIL =", serviceAccount.client_email);
  console.log("FIREBASE APP INIT OK");
  console.log("FIRESTORE DB READY =", !!db);
} else {
  console.warn("⚠️ Firebase désactivé");
  console.warn("⚠️ Firestore OFF");
}

export { db };
export default admin;