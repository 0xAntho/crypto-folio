import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWalletProject, upsertWalletProject } from "@/lib/repo/walletProjects";
import { getProject } from "@/lib/repo/projects";
import { getWallet } from "@/lib/repo/wallets";
import { fetchWalletStats } from "@/lib/hyperliquid";
import { fetchExtendedStats } from "@/lib/extended";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  console.log(`[wp-sync] id=${id}`);
  const entry = getWalletProject(id);
  console.log(`[wp-sync] entry=${entry ? entry.id : "NOT FOUND"}`);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = getProject(entry.project_id);
  console.log(`[wp-sync] project=${project?.name ?? "NOT FOUND"} sync_adapter=${project?.sync_adapter}`);
  if (!project?.sync_adapter) return NextResponse.json({ error: "No sync adapter configured" }, { status: 400 });

  const wallet = getWallet(entry.wallet_id);
  console.log(`[wp-sync] wallet=${wallet?.address ?? "NOT FOUND"}`);
  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

  console.log(`[sync] project=${project.name} sync_adapter=${project.sync_adapter} hl_dex=${project.hl_dex} wallet=${wallet.address}`);
  try {
    let volume_usd: number | null = null;
    let pnl_usd: number | null = null;
    if (project.sync_adapter === "hyperliquid") {
      const stats = await fetchWalletStats(wallet.address, project.hl_dex);
      volume_usd = stats.volume_usd;
      pnl_usd = stats.pnl_usd;
      upsertWalletProject({ ...entry, volume_usd, pnl_usd, fees_usd: stats.fees_usd });
    } else if (project.sync_adapter === "extended") {
      const stats = await fetchExtendedStats();
      volume_usd = stats.volume_usd;
      pnl_usd = stats.pnl_usd;
      upsertWalletProject({ ...entry, volume_usd, pnl_usd, fees_usd: stats.fees_usd });
    }
    return NextResponse.json({ ok: true, volume_usd, pnl_usd });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync error";
    console.error("[wallet-project sync]", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
