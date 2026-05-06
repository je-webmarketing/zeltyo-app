import dotenv from "dotenv";
dotenv.config();

import admin from "firebase-admin";

let db = null;

import fs from "fs";
import path from "path";

function getServiceAccount() {
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;

  if (!filePath) {
    console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_FILE manquant");
    return null;
  }

  try {
    const fullPath = path.resolve(filePath);
    const file = fs.readFileSync(fullPath, "utf-8");
    return JSON.parse(file);
  } catch (error) {
    console.error("❌ Erreur lecture fichier Firebase :", error.message);
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