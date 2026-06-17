import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWallet, upsertBalanceCache } from "@/lib/repo/wallets";
import { upsertBaselineIfMissing } from "@/lib/repo/positionBaselines";
import { fetchPortfolio, fetchPositions, fetchDefiPositions } from "@/lib/zerion";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const wallet = getWallet(id);
  console.log(`[sync] id=${id} wallet=${wallet?.address ?? "NOT FOUND"}`);
  if (!wallet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    console.log(`[sync] fetching Zerion data for ${wallet.address}`);
    const [portfolio, positions, defiPositions] = await Promise.all([
      fetchPortfolio(wallet.address),
      fetchPositions(wallet.address),
      fetchDefiPositions(wallet.address),
    ]);
    const walletTotal = portfolio.data.attributes.total.positions;
    const defiOnly = defiPositions;
    const defiNet = defiOnly.data.reduce((sum, p) => {
      const v = p.attributes.value ?? 0;
      return sum + (p.attributes.position_type === "loan" ? -v : v);
    }, 0);
    const totalUsd = walletTotal + defiNet;
    const payload = JSON.stringify({ portfolio, positions, defiPositions: defiOnly });
    upsertBalanceCache(id, totalUsd, payload);

    for (const p of positions.data) {
      const price = p.attributes.price;
      if (price == null) continue;
      const symbol = p.attributes.fungible_info.symbol;
      const chain = p.relationships.chain.data.id;
      upsertBaselineIfMissing(id, `${symbol}:${chain}`, symbol, price);
    }
    console.log(`[sync] done id=${id} total_usd=${totalUsd} positions=${positions.data.length}`);
    return NextResponse.json({ total_usd: totalUsd, positions: positions.data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Zerion error";
    console.error(`[sync] failed id=${id} wallet=${wallet.address}:`, msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
