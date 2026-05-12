import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWalletProject, upsertWalletProject } from "@/lib/repo/walletProjects";
import { getProject } from "@/lib/repo/projects";
import { getWallet } from "@/lib/repo/wallets";
import { fetchWalletStats } from "@/lib/hyperliquid";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entry = getWalletProject(id);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = getProject(entry.project_id);
  if (!project?.sync_adapter) return NextResponse.json({ error: "No sync adapter configured" }, { status: 400 });

  const wallet = getWallet(entry.wallet_id);
  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

  console.log(`[sync] project=${project.name} sync_adapter=${project.sync_adapter} hl_dex=${project.hl_dex} wallet=${wallet.address}`);
  try {
    if (project.sync_adapter === "hyperliquid") {
      const stats = await fetchWalletStats(wallet.address, project.hl_dex);
      upsertWalletProject({ ...entry, volume_usd: stats.volume_usd, pnl_usd: stats.pnl_usd });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync error";
    console.error("[wallet-project sync]", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
