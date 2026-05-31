import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWallet } from "@/lib/repo/wallets";
import { deleteManualHolding } from "@/lib/repo/manualHoldings";

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
