import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

export function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Token manquant",
      });
    }

    const user = jwt.verify(token, JWT_SECRET);

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      error: "Session invalide ou expirée",
    });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        error: "Accès refusé",
      });
    }

    next();
  };
}