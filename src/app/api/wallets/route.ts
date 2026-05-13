import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listWallets, createWallet, reorderWallets } from "@/lib/repo/wallets";

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
  try {
    const wallet = createWallet(crypto.randomUUID(), address, label);
    return NextResponse.json(wallet, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("UNIQUE")) {
      return NextResponse.json({ error: "This wallet is already added." }, { status: 409 });
    }
    throw e;
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { ids } = await req.json();
  if (!Array.isArray(ids)) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  reorderWallets(ids);
  return NextResponse.json({ ok: true });
}
