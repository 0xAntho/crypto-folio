// Run once: node scripts/seed-user.mjs
// Reads AUTH_USERNAME and AUTH_PASSWORD from .env.local
import { readFileSync } from "fs";
import { createHash } from "crypto";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// Parse .env.local manually
const env = Object.fromEntries(
  readFileSync(path.join(root, ".env.local"), "utf-8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
);

const username = env["AUTH_USERNAME"];
const password = env["AUTH_PASSWORD"];
if (!username || !password) {
  console.error("Set AUTH_USERNAME and AUTH_PASSWORD in .env.local");
  process.exit(1);
}

const db = new Database(path.join(root, "db", "crypto-folio.db"));
const schema = readFileSync(path.join(root, "db", "schema.sql"), "utf-8");
db.exec(schema);

const hash = await bcrypt.hash(password, 12);
const id = createHash("sha256").update(username).digest("hex").slice(0, 24);

db.prepare(
  `INSERT OR REPLACE INTO user (id, username, password_hash) VALUES (?, ?, ?)`
).run(id, username, hash);

console.log(`User "${username}" seeded.`);
