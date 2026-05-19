PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user (
  id            TEXT PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet (
  id         TEXT PRIMARY KEY,
  address    TEXT UNIQUE NOT NULL,
  label      TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS balance_cache (
  wallet_id  TEXT PRIMARY KEY REFERENCES wallet(id) ON DELETE CASCADE,
  total_usd  REAL NOT NULL,
  payload    TEXT NOT NULL,
  fetched_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS project (
  id           TEXT PRIMARY KEY,
  name         TEXT UNIQUE NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('PERP', 'LP', 'OTHER')),
  url          TEXT,
  logo_url     TEXT,
  notes        TEXT,
  sync_adapter TEXT,
  hl_dex       TEXT
);

CREATE TABLE IF NOT EXISTS wallet_project (
  id              TEXT PRIMARY KEY,
  wallet_id       TEXT NOT NULL REFERENCES wallet(id)  ON DELETE CASCADE,
  project_id      TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  volume_usd      REAL,
  fees_usd        REAL,
  initial_liq_usd REAL,
  current_apr     REAL,
  gas_usd         REAL,
  points          REAL,
  pnl_usd         REAL,
  custom_fields   TEXT NOT NULL DEFAULT '{}',
  updated_at      INTEGER NOT NULL,
  UNIQUE(wallet_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_wp_wallet  ON wallet_project(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wp_project ON wallet_project(project_id);

CREATE TABLE IF NOT EXISTS portfolio_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  total_usd   REAL NOT NULL,
  recorded_at INTEGER NOT NULL
);
