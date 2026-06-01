import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWallet } from "@/lib/repo/wallets";
import { fetchHLHoldings } from "@/lib/hyperliquid";
import { upsertHLSpotCache } from "@/lib/repo/hlSpotCache";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const wallet = getWallet(id);
  if (!wallet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const positions = await fetchHLHoldings(wallet.address);
    upsertHLSpotCache(id, positions);
    return NextResponse.json({ ok: true, count: positions.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
