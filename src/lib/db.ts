import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "db", "crypto-folio.db");
const SCHEMA_PATH = path.join(process.cwd(), "db", "schema.sql");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  _db.exec(schema);
  try { _db.exec(`ALTER TABLE project ADD COLUMN sync_adapter TEXT`); } catch {}
  try { _db.exec(`ALTER TABLE project ADD COLUMN hl_dex TEXT`); } catch {}
  try { _db.exec(`ALTER TABLE wallet_project ADD COLUMN pnl_usd REAL`); } catch {}
  try { _db.exec(`ALTER TABLE wallet ADD COLUMN sort_order INTEGER`); } catch {}
  try { _db.exec(`ALTER TABLE wallet ADD COLUMN displayed_total REAL`); } catch {}
  _db.exec(`UPDATE wallet SET sort_order = created_at WHERE sort_order IS NULL`);
  _db.exec(`CREATE TABLE IF NOT EXISTS manual_holding (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL REFERENCES wallet(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    chain TEXT NOT NULL,
    qty REAL NOT NULL,
    price REAL,
    price_fetched_at INTEGER
  )`);
  _db.exec(`CREATE TABLE IF NOT EXISTS hl_spot_cache (
    wallet_id    TEXT PRIMARY KEY REFERENCES wallet(id) ON DELETE CASCADE,
    payload      TEXT NOT NULL,
    hl_total_usd REAL NOT NULL DEFAULT 0,
    fetched_at   INTEGER NOT NULL
  )`);
  try { _db.exec(`ALTER TABLE hl_spot_cache ADD COLUMN hl_total_usd REAL NOT NULL DEFAULT 0`); } catch {}
  _db.exec(`CREATE TABLE IF NOT EXISTS hidden_position (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL REFERENCES wallet(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    UNIQUE(wallet_id, key)
  )`);
  _db.exec(`CREATE TABLE IF NOT EXISTS position_override (
    wallet_id TEXT NOT NULL REFERENCES wallet(id) ON DELETE CASCADE,
    position_key TEXT NOT NULL,
    qty_override REAL,
    price_override REAL,
    PRIMARY KEY (wallet_id, position_key)
  )`);
  return _db;
}
