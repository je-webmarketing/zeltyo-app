import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";

import notificationsRouter from "./routes/notifications.js";
import automationRoutes from "./routes/automation.js";
import clientsRouter from "./routes/clients.js";
import automationSegmentedRouter, {
  runSegmentedAutomation,
} from "./routes/automationSegmented.js";
import { sendPush } from "./services/onesignal.js";
import notificationsAdvanced from "./routes/notificationsAdvanced.js";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

console.log("✅ ZELTYO BACKEND CORS FIX");

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "https://zeltyo.netlify.app",
  "https://zeltyo-clients.netlify.app",
  "https://zeltyo-merchant.netlify.app",
  process.env.CLIENT_APP_URL,
  process.env.MERCHANT_APP_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    console.log("🌍 Origin:", origin);

    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);

    return callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));


app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "zeltyo-backend",
    version: "CORS_FIX_01",
  });
});

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Zeltyo backend OK",
    version: "CORS_FIX_01",
  });
});

app.use("/auth", authRoutes);
app.use("/notifications-advanced", notificationsAdvanced);
app.use("/notifications", notificationsRouter);
app.use("/automation", automationRoutes);
app.use("/clients", clientsRouter);
app.use("/automation-segmented", automationSegmentedRouter);

app.get("/test-push", async (req, res) => {
  try {
    const result = await sendPush({
      title: "Test Zeltyo",
      message: "La notification push fonctionne 🚀",
      externalIds: ["0600000000"],
    });

    res.json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error("❌ Erreur test push :", error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

cron.schedule("0 10 * * *", async () => {
  console.log("⏰ Lancement automatique daily 10h");

  try {
    const inactiveResults = await runSegmentedAutomation("inactive");
    console.log("✅ Inactifs :", inactiveResults.length);

    const loyalResults = await runSegmentedAutomation("loyal");
    console.log("✅ Loyal :", loyalResults.length);

    const vipResults = await runSegmentedAutomation("vip");
    console.log("✅ VIP :", vipResults.length);
  } catch (error) {
    console.error("❌ Erreur cron daily :", error);
  }
});

app.use((err, req, res, next) => {
  console.error("❌ Erreur serveur :", err.message);

  if (err.message?.includes("CORS")) {
    return res.status(403).json({
      ok: false,
      error: err.message,
    });
  }

  return res.status(500).json({
    ok: false,
    error: "Erreur interne serveur",
  });
});

app.listen(port, () => {
  console.log(`✅ Backend lancé sur le port ${port}`);
});