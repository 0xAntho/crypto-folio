import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWallet } from "@/lib/repo/wallets";
import { deleteManualHolding, updateManualHolding } from "@/lib/repo/manualHoldings";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; holdingId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, holdingId } = await params;
  const wallet = getWallet(id);
  if (!wallet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const qty = typeof body.qty === "number" ? body.qty : null;
  const price = typeof body.price === "number" ? body.price : null;
  updateManualHolding(holdingId, id, qty, price);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; holdingId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, holdingId } = await params;
  const wallet = getWallet(id);
  if (!wallet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  deleteManualHolding(holdingId, id);
  return NextResponse.json({ ok: true });
}
