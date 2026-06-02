import { getDb } from "@/lib/db";

export interface PositionOverride {
  qty_override: number | null;
  price_override: number | null;
}

export function getPositionOverrides(walletId: string): Map<string, PositionOverride> {
  const rows = getDb()
    .prepare(`SELECT position_key, qty_override, price_override FROM position_override WHERE wallet_id = ?`)
    .all(walletId) as Array<{ position_key: string; qty_override: number | null; price_override: number | null }>;
  return new Map(rows.map((r) => [r.position_key, { qty_override: r.qty_override, price_override: r.price_override }]));
}

export function getPositionOverride(walletId: string, key: string): PositionOverride | null {
  return (getDb()
    .prepare(`SELECT qty_override, price_override FROM position_override WHERE wallet_id = ? AND position_key = ?`)
    .get(walletId, key) as PositionOverride | undefined) ?? null;
}

export function upsertPositionOverride(walletId: string, key: string, qty: number | null, price: number | null): void {
  getDb()
    .prepare(`INSERT INTO position_override (wallet_id, position_key, qty_override, price_override)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(wallet_id, position_key) DO UPDATE SET
                qty_override = excluded.qty_override,
                price_override = excluded.price_override`)
    .run(walletId, key, qty, price);
}
