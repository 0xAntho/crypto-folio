import { getDb } from "@/lib/db";

export interface WalletProject {
  id: string;
  wallet_id: string;
  project_id: string;
  volume_usd: number | null;
  fees_usd: number | null;
  initial_liq_usd: number | null;
  current_apr: number | null;
  gas_usd: number | null;
  points: number | null;
  pnl_usd: number | null;
  custom_fields: string;
  status: string;
  updated_at: number;
}

export interface WalletProjectWithNames extends WalletProject {
  project_name: string;
  project_type: string;
  project_sync_adapter: string | null;
  wallet_label: string;
  wallet_address: string;
}

export function listByWallet(walletId: string): WalletProjectWithNames[] {
  return getDb()
    .prepare(
      `SELECT wp.*, p.name AS project_name, p.type AS project_type,
              p.sync_adapter AS project_sync_adapter,
              w.label AS wallet_label, w.address AS wallet_address
       FROM wallet_project wp
       JOIN project p ON p.id = wp.project_id
       JOIN wallet  w ON w.id = wp.wallet_id
       WHERE wp.wallet_id = ?
       ORDER BY p.name ASC`
    )
    .all(walletId) as WalletProjectWithNames[];
}

export function listByProject(projectId: string): WalletProjectWithNames[] {
  return getDb()
    .prepare(
      `SELECT wp.*, p.name AS project_name, p.type AS project_type,
              p.sync_adapter AS project_sync_adapter,
              w.label AS wallet_label, w.address AS wallet_address
       FROM wallet_project wp
       JOIN project p ON p.id = wp.project_id
       JOIN wallet  w ON w.id = wp.wallet_id
       WHERE wp.project_id = ?
       ORDER BY w.label ASC`
    )
    .all(projectId) as WalletProjectWithNames[];
}

export function listAll(): WalletProjectWithNames[] {
  return getDb()
    .prepare(
      `SELECT wp.*, p.name AS project_name, p.type AS project_type,
              p.sync_adapter AS project_sync_adapter,
              w.label AS wallet_label, w.address AS wallet_address
       FROM wallet_project wp
       JOIN project p ON p.id = wp.project_id
       JOIN wallet  w ON w.id = wp.wallet_id
       ORDER BY p.name ASC, w.label ASC`
    )
    .all() as WalletProjectWithNames[];
}

export function getWalletProject(id: string): WalletProject | undefined {
  return getDb()
    .prepare(`SELECT * FROM wallet_project WHERE id = ?`)
    .get(id) as WalletProject | undefined;
}

export function upsertWalletProject(
  entry: Omit<WalletProject, "updated_at" | "status">
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO wallet_project
       (id, wallet_id, project_id, volume_usd, fees_usd, initial_liq_usd,
        current_apr, gas_usd, points, pnl_usd, custom_fields, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(wallet_id, project_id) DO UPDATE SET
       volume_usd      = excluded.volume_usd,
       fees_usd        = excluded.fees_usd,
       initial_liq_usd = excluded.initial_liq_usd,
       current_apr     = excluded.current_apr,
       gas_usd         = excluded.gas_usd,
       points          = excluded.points,
       pnl_usd         = excluded.pnl_usd,
       custom_fields   = excluded.custom_fields,
       updated_at      = excluded.updated_at`
  ).run(
    entry.id,
    entry.wallet_id,
    entry.project_id,
    entry.volume_usd,
    entry.fees_usd,
    entry.initial_liq_usd,
    entry.current_apr,
    entry.gas_usd,
    entry.points,
    entry.pnl_usd,
    entry.custom_fields,
    Date.now()
  );
}

export function deleteWalletProject(id: string): void {
  getDb().prepare(`DELETE FROM wallet_project WHERE id = ?`).run(id);
}

export function setWalletProjectStatus(id: string, status: "active" | "closed"): void {
  getDb().prepare(`UPDATE wallet_project SET status = ? WHERE id = ?`).run(status, id);
}
