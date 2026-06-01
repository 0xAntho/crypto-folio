import { getDb } from "@/lib/db";
import type { HLSpotPosition } from "@/lib/hyperliquid";

export interface HLSpotCache {
  wallet_id: string;
  payload: string;
  hl_total_usd: number;
  fetched_at: number;
}

export function getHLSpotCache(walletId: string): HLSpotCache | undefined {
  return getDb()
    .prepare(`SELECT * FROM hl_spot_cache WHERE wallet_id = ?`)
    .get(walletId) as HLSpotCache | undefined;
}

export function upsertHLSpotCache(walletId: string, positions: HLSpotPosition[]): void {
  const total = positions.reduce((s, p) => s + (p.value ?? 0), 0);
  getDb()
    .prepare(
      `INSERT INTO hl_spot_cache (wallet_id, payload, hl_total_usd, fetched_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(wallet_id) DO UPDATE SET
         payload      = excluded.payload,
         hl_total_usd = excluded.hl_total_usd,
         fetched_at   = excluded.fetched_at`
    )
    .run(walletId, JSON.stringify(positions), total, Date.now());
}
