import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWallet } from "@/lib/repo/wallets";
import { createManualHolding } from "@/lib/repo/manualHoldings";
import { searchFungiblePrice } from "@/lib/zerion";
import { randomUUID } from "crypto";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const wallet = getWallet(id);
  if (!wallet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { symbol, chain, qty } = await req.json();
  if (!symbol || !chain || qty == null) {
    return NextResponse.json({ error: "symbol, chain, and qty are required" }, { status: 400 });
  }

  const fungible = await searchFungiblePrice(String(symbol).toUpperCase(), String(chain));
  const price = fungible?.price ?? null;
  const name = fungible?.name ?? String(symbol).toUpperCase();

  const holding = createManualHolding(
    randomUUID(),
    id,
    String(symbol).toUpperCase(),
    name,
    String(chain),
    Number(qty),
    price
  );

  return NextResponse.json(holding, { status: 201 });
}
