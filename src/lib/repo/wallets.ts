import { getDb } from "@/lib/db";

export interface Wallet {
  id: string;
  address: string;
  label: string;
  created_at: number;
  sort_order: number;
  displayed_total: number | null;
}

export interface BalanceCache {
  wallet_id: string;
  total_usd: number;
  payload: string;
  fetched_at: number;
}

export interface WalletWithCache extends Wallet {
  total_usd: number | null;
  hl_total_usd: number | null;
  fetched_at: number | null;
  displayed_total: number | null;
}

export function listWallets(): WalletWithCache[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT w.*, bc.total_usd, bc.fetched_at, hlc.hl_total_usd
       FROM wallet w
       LEFT JOIN balance_cache bc ON bc.wallet_id = w.id
       LEFT JOIN hl_spot_cache hlc ON hlc.wallet_id = w.id
       ORDER BY COALESCE(w.sort_order, w.created_at) ASC`
    )
    .all() as WalletWithCache[];
}

export function getWallet(id: string): WalletWithCache | undefined {
  const db = getDb();
  return db
    .prepare(
      `SELECT w.*, bc.total_usd, bc.fetched_at, hlc.hl_total_usd
       FROM wallet w
       LEFT JOIN balance_cache bc ON bc.wallet_id = w.id
       LEFT JOIN hl_spot_cache hlc ON hlc.wallet_id = w.id
       WHERE w.id = ?`
    )
    .get(id) as WalletWithCache | undefined;
}

export function getWalletByAddress(address: string): WalletWithCache | undefined {
  const db = getDb();
  return db
    .prepare(
      `SELECT w.*, bc.total_usd, bc.fetched_at, hlc.hl_total_usd
       FROM wallet w
       LEFT JOIN balance_cache bc ON bc.wallet_id = w.id
       LEFT JOIN hl_spot_cache hlc ON hlc.wallet_id = w.id
       WHERE w.address = ?`
    )
    .get(address.toLowerCase()) as WalletWithCache | undefined;
}

export function createWallet(id: string, address: string, label: string): Wallet {
  const db = getDb();
  const now = Date.now();
  db.prepare(
    `INSERT INTO wallet (id, address, label, created_at) VALUES (?, ?, ?, ?)`
  ).run(id, address.toLowerCase(), label, now);
  return { id, address: address.toLowerCase(), label, created_at: now };
}

export function reorderWallets(ids: string[]): void {
  const db = getDb();
  const update = db.prepare(`UPDATE wallet SET sort_order = ? WHERE id = ?`);
  db.transaction(() => {
    ids.forEach((id, i) => update.run(i, id));
  })();
}

export function saveDisplayedTotal(walletId: string, total: number): void {
  getDb()
    .prepare(`UPDATE wallet SET displayed_total = ? WHERE id = ?`)
    .run(total, walletId);
}

export function updateWallet(id: string, label: string): void {
  getDb()
    .prepare(`UPDATE wallet SET label = ? WHERE id = ?`)
    .run(label, id);
}

export function deleteWallet(id: string): void {
  getDb().prepare(`DELETE FROM wallet WHERE id = ?`).run(id);
}

export function upsertBalanceCache(
  walletId: string,
  totalUsd: number,
  payload: string
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO balance_cache (wallet_id, total_usd, payload, fetched_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(wallet_id) DO UPDATE SET
       total_usd  = excluded.total_usd,
       payload    = excluded.payload,
       fetched_at = excluded.fetched_at`
  ).run(walletId, totalUsd, payload, Date.now());
}

export function getBalanceCache(walletId: string): BalanceCache | undefined {
  return getDb()
    .prepare(`SELECT * FROM balance_cache WHERE wallet_id = ?`)
    .get(walletId) as BalanceCache | undefined;
}

export function listPositionsByWallet(): { wallet_id: string; payload: string | null }[] {
  return getDb()
    .prepare(`SELECT wallet_id, payload FROM balance_cache`)
    .all() as { wallet_id: string; payload: string | null }[];
}
