import { getDb } from "@/lib/db";

export function recordSnapshot(totalUsd: number): void {
  getDb()
    .prepare(`INSERT INTO portfolio_history (total_usd, recorded_at) VALUES (?, ?)`)
    .run(totalUsd, Date.now());
}

export function listHistory(limit = 60): { total_usd: number; recorded_at: number }[] {
  return getDb()
    .prepare(
      `SELECT total_usd, recorded_at FROM portfolio_history ORDER BY recorded_at DESC LIMIT ?`
    )
    .all(limit) as { total_usd: number; recorded_at: number }[];
}
