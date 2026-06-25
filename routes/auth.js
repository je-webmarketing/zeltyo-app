import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/requireAuth.js";
import { sendResetPasswordEmail } from "../services/email.js";

console.log("✅ AUTH ROUTES VERSION SMTP_01 CHARGÉE");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const JWT_EXPIRES_IN = "12h";

/**
 * Démo mémoire.
 * Plus tard tu remplaceras ça par une vraie base.
 */
const merchantUsers = [
  {
  id: "user_lavaux_admin",
  email: "admin@lavauxfood.ch",
  passwordHash: bcrypt.hashSync("Zeltyo123!", 10),
  role: "merchant_admin",
  businessId: "BUS-2",
  name: "Lavaux Food Admin",
  isActive: true,
},
  {
  id: "user_lavaux_employee",
  email: "employee@lavauxfood.ch",
  passwordHash: bcrypt.hashSync("Zeltyo123!", 10),
  role: "merchant_employee",
  businessId: "BUS-2",
  name: "Lavaux Food Employé",
  isActive: true,
},
    {
    id: "user_istanbul_admin",
    email: "admin@istanbulkebab.fr",
    passwordHash: bcrypt.hashSync("Temp2026!", 10),
    role: "merchant_admin",
    businessId: "BUS-ISTANBUL",
    name: "Istanbul Kebab Admin",
    isActive: true,
  },
  {
    id: "user_petitbistro_admin",
    email: "admin@lepetitbistro.fr",
    passwordHash: bcrypt.hashSync("Temp2026!", 10),
    role: "merchant_admin",
    businessId: "BUS-PETITBISTRO",
    name: "Le Petit Bistro Admin",
    isActive: true,
  },
  {
  id: "user_istanbul_admin",
  email: "admin@istanbulkebab.fr",
  passwordHash: bcrypt.hashSync("Zeltyo123!", 10),
  role: "merchant_admin",
  businessId: "BUS-ISTANBUL",
  name: "Istanbul Kebab Admin",
  isActive: true,
},
{
  id: "user_istanbul_employee",
  email: "employee@istanbulkebab.fr",
  passwordHash: bcrypt.hashSync("Zeltyo123!", 10),
  role: "merchant_employee",
  businessId: "BUS-ISTANBUL",
  name: "Istanbul Kebab Employé",
  isActive: true,
},
{
  id: "user_test_eric",
  email: "ericjarry34@gmail.com",
  passwordHash: bcrypt.hashSync("Temp2026!", 10),
  role: "merchant_admin",
  businessId: "BUS-ISTANBUL",
  name: "Test Eric",
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

router.post("/forgot-password", async (req, res) => {
  console.log("FORGOT PASSWORD ROUTE HIT", {
  origin: req.headers.origin,
  email: req.body?.email,
});

  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        ok: false,
        error: "Email requis",
      });
    }

    const user = merchantUsers.find(
      (item) => String(item.email || "").toLowerCase() === email
    );

    // Réponse neutre : ne révèle pas si le compte existe
    if (!user) {
      return res.json({
        ok: true,
        message:
          "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.",
      });
    }

    const resetToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        purpose: "password_reset",
      },
      JWT_SECRET,
      { expiresIn: "30m" }
    );

    const resetUrl = `${process.env.MERCHANT_RESET_URL}?token=${resetToken}`;

    console.log("✅ BEFORE SMTP SEND", {
  to: user.email,
  resetUrl,
});

    await sendResetPasswordEmail({
      to: user.email,
      resetUrl,
    });

    return res.json({
      ok: true,
      message:
        "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.",
    });
  } catch (error) {
    console.error("forgot-password error:", error);

    return res.status(500).json({
      ok: false,
      error: "Erreur lors de l'envoi de l'email de réinitialisation",
    });
  }
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