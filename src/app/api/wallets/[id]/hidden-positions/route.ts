import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWallet } from "@/lib/repo/wallets";
import { hidePosition } from "@/lib/repo/hiddenPositions";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const wallet = getWallet(id);
  if (!wallet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { key } = await req.json();
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });

  hidePosition(id, String(key));
  return NextResponse.json({ ok: true });
}
