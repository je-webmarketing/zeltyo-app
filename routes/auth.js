import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const JWT_EXPIRES_IN = "12h";

/**
 * Démo mémoire.
 * Plus tard tu remplaceras ça par une vraie base.
 */
const merchantUsers = [
  {
    id: "user_1",
    email: "admin@barberclub.ch",
    passwordHash: bcrypt.hashSync("Zeltyo123!", 10),
    role: "merchant_admin",
    businessId: "BUS-2",
    name: "Barber Club Admin",
    isActive: true,
  },
  {
    id: "user_2",
    email: "employee@barberclub.ch",
    passwordHash: bcrypt.hashSync("Zeltyo123!", 10),
    role: "merchant_employee",
    businessId: "BUS-2",
    name: "Barber Club Employé",
    isActive: true,
  },
];

router.post("/merchant-login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        error: "Email et mot de passe obligatoires",
      });
    }

    const user = merchantUsers.find(
      (item) => String(item.email || "").toLowerCase() === email
    );

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: "Identifiants invalides",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        ok: false,
        error: "Compte désactivé",
      });
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);

    if (!passwordOk) {
      return res.status(401).json({
        ok: false,
        error: "Identifiants invalides",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("merchant-login error:", error);
    return res.status(500).json({
      ok: false,
      error: "Erreur serveur",
    });
  }
});

router.get("/merchant-me", requireAuth, (req, res) => {
  return res.json({
    ok: true,
    user: req.user,
  });
});

router.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  const user = merchantUsers.find(
    (u) => u.email.toLowerCase() === String(email).toLowerCase()
  );

  if (!user) {
    return res.json({ ok: true }); // sécurité (on ne dit pas si email existe)
  }

  const resetToken = jwt.sign(
    { id: user.id },
    JWT_SECRET,
    { expiresIn: "15m" }
  );

  console.log("🔑 RESET TOKEN:", resetToken);

  return res.json({
    ok: true,
    message: "Lien de réinitialisation généré",
   resetToken 
  });
});

router.post("/reset-password", async (req, res) => {
  try {
    const token = String(req.body?.token || "");
    const password = String(req.body?.password || "");

    if (!token || !password) {
      return res.status(400).json({
        ok: false,
        error: "Token et mot de passe obligatoires",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = merchantUsers.find((u) => u.id === decoded.id);

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "Utilisateur introuvable",
      });
    }

    user.passwordHash = await bcrypt.hash(password, 10);

    return res.json({
      ok: true,
      message: "Mot de passe mis à jour",
    });
  } catch (error) {
    console.error("reset-password error:", error);
    return res.status(400).json({
      ok: false,
      error: "Lien invalide ou expiré",
    });
  }
});

export default router;