import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listWallets, createWallet } from "@/lib/repo/wallets";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(listWallets());
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { address, label } = await req.json();
  if (!address || !label) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const wallet = createWallet(crypto.randomUUID(), address, label);
  return NextResponse.json(wallet, { status: 201 });
}
