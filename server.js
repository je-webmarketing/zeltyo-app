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
import bookingsRouter from "./routes/bookings.js";
import menuRouter from "./routes/menu.js";
import stripeRoutes from "./routes/stripe.js";
import promotionsRouter from "./routes/promotions.js";
import businessesRouter from "./routes/businesses.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === "production";

console.log("✅ ZELTYO BACKEND CLEAN");

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5175",
  "https://zeltyo.netlify.app",
  "https://zeltyo-clients.netlify.app",
  "https://zeltyo-merchant.netlify.app",
  "https://zeltyo-commercant.netlify.app",
  process.env.CLIENT_APP_URL,
  process.env.MERCHANT_APP_URL,
].filter(Boolean);

function basicRateLimit({ windowMs = 60_000, max = 120 } = {}) {
  const hits = new Map();

  return (req, res, next) => {
    const key =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";

    const now = Date.now();
    const current = hits.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > current.resetAt) {
      current.count = 0;
      current.resetAt = now + windowMs;
    }

    current.count += 1;
    hits.set(key, current);

    if (current.count > max) {
      return res.status(429).json({
        ok: false,
        error: "Trop de requêtes, réessayez dans un instant",
      });
    }

    return next();
  };
}

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "500kb" }));
app.use(basicRateLimit({ windowMs: 60_000, max: isProd ? 180 : 1000 }));

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "zeltyo-backend",
    version: "SECURITY_READY_01",
  });
});

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Zeltyo backend OK",
    version: "SECURITY_READY_01",
  });
});

app.use("/auth", authRoutes);
app.use("/notifications-advanced", notificationsAdvanced);
app.use("/notifications", notificationsRouter);
app.use("/automation", automationRoutes);
app.use("/businesses", businessesRouter);
app.use("/clients", clientsRouter);
app.use("/bookings", bookingsRouter);
app.use("/menu", menuRouter);
app.use("/automation-segmented", automationSegmentedRouter);
app.use("/stripe", stripeRoutes);
app.use("/promotions", promotionsRouter);

if (!isProd) {
  app.get("/test-push", async (req, res) => {
    try {
      const result = await sendPush({
        title: "Test Zeltyo",
        message: "La notification push fonctionne 🚀",
        externalIds: ["0600000000"],
      });

      res.json({ ok: true, result });
    } catch (error) {
      console.error("❌ Erreur test push :", error);
      res.status(500).json({
        ok: false,
        error: "Erreur test push",
      });
    }
  });
}

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
    console.error("❌ Erreur cron daily :", error.message);
  }
});

app.use((req, res) => {
  return res.status(404).json({
    ok: false,
    error: "Route introuvable",
  });
});

app.use((err, req, res, next) => {
  console.error("❌ Erreur serveur :", err.message);

  if (err.message?.includes("CORS")) {
    return res.status(403).json({
      ok: false,
      error: isProd ? "Origine non autorisée" : err.message,
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