// Run once: node scripts/seed-user.mjs
// Reads AUTH_USERNAME and AUTH_PASSWORD from .env.local, falling back to process.env
// (e.g. `railway run node scripts/seed-user.mjs` where there is no .env.local)
import { readFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const envLocalPath = path.join(root, ".env.local");
const env = existsSync(envLocalPath)
  ? Object.fromEntries(
      readFileSync(envLocalPath, "utf-8")
        .split("\n")
        .filter((l) => l.includes("=") && !l.startsWith("#"))
        .map((l) => l.split("=").map((s) => s.trim()))
    )
  : process.env;

const username = env["AUTH_USERNAME"];
const password = env["AUTH_PASSWORD"];
if (!username || !password) {
  console.error("Set AUTH_USERNAME and AUTH_PASSWORD in .env.local");
  process.exit(1);
}

const dbDir = process.env.DB_DIR ?? path.join(root, "db");
const db = new Database(path.join(dbDir, "crypto-folio.db"));
const schema = readFileSync(path.join(root, "db", "schema.sql"), "utf-8");
db.exec(schema);

const hash = await bcrypt.hash(password, 12);
const id = createHash("sha256").update(username).digest("hex").slice(0, 24);

db.prepare(
  `INSERT OR REPLACE INTO user (id, username, password_hash) VALUES (?, ?, ?)`
).run(id, username, hash);

console.log(`User "${username}" seeded.`);
