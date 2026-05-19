import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { recordSnapshot } from "@/lib/repo/portfolio";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = getDb()
    .prepare(`SELECT COALESCE(SUM(total_usd), 0) as total FROM balance_cache`)
    .get() as { total: number };

  recordSnapshot(row.total);
  return NextResponse.json({ total_usd: row.total });
}
