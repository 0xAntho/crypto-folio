import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { recordSnapshot } from "@/lib/repo/portfolio";
import { recordWalletSnapshot } from "@/lib/repo/walletBalanceHistory";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(bc.total_usd), 0) + COALESCE(SUM(hlc.hl_total_usd), 0) AS total
       FROM balance_cache bc
       LEFT JOIN hl_spot_cache hlc ON hlc.wallet_id = bc.wallet_id`
    )
    .get() as { total: number };

  recordSnapshot(row.total);

  const perWallet = getDb()
    .prepare(
      `SELECT bc.wallet_id AS wallet_id, bc.total_usd + COALESCE(hlc.hl_total_usd, 0) AS total
       FROM balance_cache bc
       LEFT JOIN hl_spot_cache hlc ON hlc.wallet_id = bc.wallet_id`
    )
    .all() as { wallet_id: string; total: number }[];
  for (const w of perWallet) {
    recordWalletSnapshot(w.wallet_id, w.total);
  }

  return NextResponse.json({ total_usd: row.total });
}
