import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWallet } from "@/lib/repo/wallets";
import { getPositionOverride, upsertPositionOverride } from "@/lib/repo/positionOverrides";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const wallet = getWallet(id);
  if (!wallet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { key } = body;
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });

  const existing = getPositionOverride(id, key);
  const qty = "qty" in body ? (typeof body.qty === "number" ? body.qty : null) : (existing?.qty_override ?? null);
  const price = "price" in body ? (typeof body.price === "number" ? body.price : null) : (existing?.price_override ?? null);

  upsertPositionOverride(id, key, qty, price);
  return NextResponse.json({ ok: true });
}
