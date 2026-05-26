import fs from "fs/promises";
import path from "path";

const filePath = path.resolve("data/promotions.json");

async function ensureFile() {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "[]", "utf8");
  }
}

function clean(value) {
  return String(value || "").trim();
}

function normalizePromotion(promo = {}) {
  return {
    id: promo.id || `PROMO-${Date.now()}`,

    businessId:
      clean(promo.businessId) ||
      clean(promo.merchantId),

    title: clean(promo.title),
    description: clean(promo.description),

    type: clean(promo.type || "flash"),

    status: clean(promo.status || "Active"),

    discount:
      Number.isFinite(Number(promo.discount))
        ? Number(promo.discount)
        : 0,

    pointsRequired:
      Number.isFinite(Number(promo.pointsRequired))
        ? Number(promo.pointsRequired)
        : 0,

    validUntil: promo.validUntil || null,

    image: promo.image || "",

    createdAt:
      promo.createdAt || new Date().toISOString(),

    updatedAt:
      promo.updatedAt || new Date().toISOString(),

    archivedAt: promo.archivedAt || null,
  };
}

export async function getAllPromotions() {
  await ensureFile();

  const raw = await fs.readFile(filePath, "utf8");

  try {
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.map(normalizePromotion)
      : [];
  } catch {
    return [];
  }
}

export async function saveAllPromotions(promotions = []) {
  await ensureFile();

  const normalized = Array.isArray(promotions)
    ? promotions.map(normalizePromotion)
    : [];

  await fs.writeFile(
    filePath,
    JSON.stringify(normalized, null, 2),
    "utf8"
  );

  return normalized;
}

export async function addPromotion(promotion = {}) {
  const promotions = await getAllPromotions();

  const normalized = normalizePromotion({
    ...promotion,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (!normalized.businessId) {
    throw new Error("businessId obligatoire");
  }

  promotions.unshift(normalized);

  await saveAllPromotions(promotions);

  return normalized;
}