import nodemailer from "nodemailer";

const requiredEnv = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`SMTP CONFIG ERROR: ${key} manquant`);
  }
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE) === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendResetPasswordEmail({ to, resetUrl }) {
 console.log("SMTP SEND START:", {
  to,
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE,
  user: process.env.SMTP_USER,
  from: process.env.SMTP_FROM,
  hasPass: Boolean(process.env.SMTP_PASS),
});

  await transporter.verify();

  const info = await transporter.sendMail({
    from: `"Zeltyo" <${process.env.SMTP_FROM}>`,
    to,
    subject: "Réinitialisation de votre mot de passe Zeltyo",
    text: `Bonjour,

Vous avez demandé à réinitialiser votre mot de passe Zeltyo.

Cliquez sur ce lien :
${resetUrl}

Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#111;padding:24px;color:#fff;">
        <div style="max-width:560px;margin:auto;background:#1a1a1a;border:1px solid #b8860b;border-radius:12px;padding:24px;">
          <h2 style="color:#d4af37;">Réinitialisation du mot de passe</h2>
          <p>Vous avez demandé à réinitialiser votre mot de passe Zeltyo.</p>
          <p>
            <a href="${resetUrl}" style="background:#d4af37;color:#111;padding:14px 22px;text-decoration:none;border-radius:8px;font-weight:bold;">
              Réinitialiser mon mot de passe
            </a>
          </p>
          <p>Lien direct : ${resetUrl}</p>
        </div>
      </div>
    `,
  });

  console.log("SMTP SEND OK:", info.messageId);
}