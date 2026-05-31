import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

export function listHiddenKeys(walletId: string): Set<string> {
  const rows = getDb()
    .prepare(`SELECT key FROM hidden_position WHERE wallet_id = ?`)
    .all(walletId) as { key: string }[];
  return new Set(rows.map((r) => r.key));
}

export function hidePosition(walletId: string, key: string): void {
  getDb()
    .prepare(
      `INSERT INTO hidden_position (id, wallet_id, key) VALUES (?, ?, ?)
       ON CONFLICT(wallet_id, key) DO NOTHING`
    )
    .run(randomUUID(), walletId, key);
}

export function unhidePosition(walletId: string, key: string): void {
  getDb()
    .prepare(`DELETE FROM hidden_position WHERE wallet_id = ? AND key = ?`)
    .run(walletId, key);
}
