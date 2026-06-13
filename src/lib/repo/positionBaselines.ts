import { getDb } from "@/lib/db";

export function getBaselines(walletId: string): Map<string, number> {
  const rows = getDb()
    .prepare(`SELECT position_key, baseline_price FROM position_baseline WHERE wallet_id = ?`)
    .all(walletId) as { position_key: string; baseline_price: number }[];
  return new Map(rows.map((r) => [r.position_key, r.baseline_price]));
}

export function upsertBaselineIfMissing(walletId: string, key: string, symbol: string, price: number): void {
  getDb()
    .prepare(
      `INSERT INTO position_baseline (wallet_id, position_key, symbol, baseline_price, first_seen_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(wallet_id, position_key) DO NOTHING`
    )
    .run(walletId, key, symbol, price, Date.now());
}
