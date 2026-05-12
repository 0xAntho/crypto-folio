import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "db", "crypto-folio.db");
const SCHEMA_PATH = path.join(process.cwd(), "db", "schema.sql");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  _db.exec(schema);
  try { _db.exec(`ALTER TABLE project ADD COLUMN sync_adapter TEXT`); } catch {}
  try { _db.exec(`ALTER TABLE wallet_project ADD COLUMN pnl_usd REAL`); } catch {}
  return _db;
}
