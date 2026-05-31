import { getDb } from "@/lib/db";

export interface ManualHolding {
  id: string;
  wallet_id: string;
  symbol: string;
  name: string;
  chain: string;
  qty: number;
  price: number | null;
  price_fetched_at: number | null;
}

export function listManualHoldings(walletId: string): ManualHolding[] {
  return getDb()
    .prepare(`SELECT * FROM manual_holding WHERE wallet_id = ? ORDER BY rowid ASC`)
    .all(walletId) as ManualHolding[];
}

export function createManualHolding(
  id: string,
  walletId: string,
  symbol: string,
  name: string,
  chain: string,
  qty: number,
  price: number | null
): ManualHolding {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO manual_holding (id, wallet_id, symbol, name, chain, qty, price, price_fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, walletId, symbol, name, chain, qty, price, now);
  return { id, wallet_id: walletId, symbol, name, chain, qty, price, price_fetched_at: now };
}

export function deleteManualHolding(id: string, walletId: string): void {
  getDb()
    .prepare(`DELETE FROM manual_holding WHERE id = ? AND wallet_id = ?`)
    .run(id, walletId);
}
