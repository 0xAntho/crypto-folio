import { getDb } from "@/lib/db";

export function recordWalletSnapshot(walletId: string, totalUsd: number): void {
  getDb()
    .prepare(`INSERT INTO wallet_balance_history (wallet_id, total_usd, recorded_at) VALUES (?, ?, ?)`)
    .run(walletId, totalUsd, Date.now());
}

export function listWalletHistory(walletId: string, limit = 60): { total_usd: number; recorded_at: number }[] {
  return getDb()
    .prepare(
      `SELECT total_usd, recorded_at FROM wallet_balance_history WHERE wallet_id = ? ORDER BY recorded_at DESC LIMIT ?`
    )
    .all(walletId, limit) as { total_usd: number; recorded_at: number }[];
}
