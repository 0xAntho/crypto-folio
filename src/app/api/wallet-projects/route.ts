import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listAll, upsertWalletProject } from "@/lib/repo/walletProjects";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(listAll());
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  upsertWalletProject({
    id: body.id ?? crypto.randomUUID(),
    wallet_id: body.wallet_id,
    project_id: body.project_id,
    volume_usd: body.volume_usd ?? null,
    fees_usd: body.fees_usd ?? null,
    initial_liq_usd: body.initial_liq_usd ?? null,
    current_apr: body.current_apr ?? null,
    gas_usd: body.gas_usd ?? null,
    points: body.points ?? null,
    pnl_usd: body.pnl_usd ?? null,
    custom_fields: JSON.stringify(body.custom_fields ?? {}),
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
