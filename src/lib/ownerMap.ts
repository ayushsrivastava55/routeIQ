import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const OWNER_FILE = path.join(DATA_DIR, "owner-map.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadOwnerMap(): Record<string, string> {
  ensureDir();
  if (!fs.existsSync(OWNER_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(OWNER_FILE, "utf-8"));
  } catch {
    return {};
  }
}

export function saveOwnerMap(map: Record<string, string>) {
  ensureDir();
  fs.writeFileSync(OWNER_FILE, JSON.stringify(map, null, 2), "utf-8");
}
