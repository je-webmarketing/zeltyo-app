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

export async function getAllPromotions() {
  await ensureFile();

  const raw = await fs.readFile(filePath, "utf8");

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveAllPromotions(promotions) {
  await ensureFile();

  await fs.writeFile(
    filePath,
    JSON.stringify(promotions, null, 2),
    "utf8"
  );

  return promotions;
}

export async function addPromotion(promotion) {
  const promotions = await getAllPromotions();

  promotions.unshift(promotion);

  await saveAllPromotions(promotions);

  return promotion;
}