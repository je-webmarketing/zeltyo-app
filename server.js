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

dotenv.config();

const app = express();

console.log("✅ ZELTYO BACKEND V2 chargé");

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Zeltyo backend OK",
    version: "V2_SEGMENTS",
  });
});

app.get("/test-push", async (req, res) => {
  const result = await sendPush({
    title: "Test Zeltyo",
    message: "La notification push fonctionne 🚀",
    externalIds: ["0600000000"],
  });

  res.json({
    ok: true,
    result,
  });
});

app.use("/notifications", notificationsRouter);
app.use("/automation", automationRoutes);
app.use("/clients", clientsRouter);
app.use("/automation-segmented", automationSegmentedRouter);

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

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`✅ Backend lancé sur http://localhost:${port}`);
});