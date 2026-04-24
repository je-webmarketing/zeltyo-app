import dotenv from "dotenv";
dotenv.config();

import admin from "firebase-admin";

let db = null;

function getServiceAccount() {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!jsonEnv) {
    console.warn("⚠️ Firebase désactivé (pas de FIREBASE_SERVICE_ACCOUNT_JSON)");
    return null;
  }

  console.log("✅ Firebase chargé depuis .env");
  return JSON.parse(jsonEnv);
}

const serviceAccount = getServiceAccount();

if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  db = admin.firestore();
  console.log("🔥 Firestore connecté");
} else {
  console.log("⚠️ Firestore OFF (mode local)");
}

export { db };
export default admin;