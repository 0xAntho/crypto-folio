import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWallet, upsertBalanceCache } from "@/lib/repo/wallets";
import { fetchPortfolio, fetchPositions } from "@/lib/zerion";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const wallet = getWallet(id);
  if (!wallet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const [portfolio, positions] = await Promise.all([
      fetchPortfolio(wallet.address),
      fetchPositions(wallet.address),
    ]);
    const totalUsd = portfolio.data.attributes.total.positions;
    const payload = JSON.stringify({ portfolio, positions });
    upsertBalanceCache(id, totalUsd, payload);
    return NextResponse.json({ total_usd: totalUsd });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Zerion error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
