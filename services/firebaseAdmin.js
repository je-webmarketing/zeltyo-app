import dotenv from "dotenv";
dotenv.config();

import admin from "firebase-admin";

function getServiceAccount() {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!jsonEnv) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON manquant");
  }

  console.log("✅ Firebase chargé depuis variable Render");

  return JSON.parse(jsonEnv);
}

const serviceAccount = getServiceAccount();

console.log("SERVICE ACCOUNT TYPE =", serviceAccount.type);
console.log("SERVICE ACCOUNT PROJECT ID =", serviceAccount.project_id);
console.log("SERVICE ACCOUNT CLIENT EMAIL =", serviceAccount.client_email);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

export const db = admin.firestore();
export default admin;