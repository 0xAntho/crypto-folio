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
  console.log(`[sync-hl-spot] id=${id} wallet=${wallet?.address ?? "NOT FOUND"}`);
  if (!wallet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    console.log(`[sync-hl-spot] fetching Hyperliquid holdings for ${wallet.address}`);
    const positions = await fetchHLHoldings(wallet.address);
    upsertHLSpotCache(id, positions);
    console.log(`[sync-hl-spot] done id=${id} count=${positions.length}`);
    return NextResponse.json({ ok: true, count: positions.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync error";
    console.error(`[sync-hl-spot] failed id=${id} wallet=${wallet.address}:`, msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
