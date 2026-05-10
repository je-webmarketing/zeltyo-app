import fs from "fs/promises";
import path from "path";

const FILE_PATH = path.resolve("data/promotions.json");

async function ensureFile() {
  try {
    await fs.access(FILE_PATH);
  } catch {
    await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
    await fs.writeFile(FILE_PATH, "[]");
  }
}

export async function getAllPromotions() {
  await ensureFile();

  const raw = await fs.readFile(FILE_PATH, "utf-8");

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveAllPromotions(promotions) {
  await ensureFile();

  await fs.writeFile(
    FILE_PATH,
    JSON.stringify(promotions, null, 2)
  );

  return promotions;
}