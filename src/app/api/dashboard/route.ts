import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listWallets } from "@/lib/repo/wallets";
import { listAll } from "@/lib/repo/walletProjects";
import { aggregateEntries, costPerPoint, costPerMVolume, totalCost } from "@/lib/metrics";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wallets = listWallets();
  const entries = listAll();

  const totalPortfolioUsd = wallets.reduce((s, w) => s + (w.total_usd ?? 0), 0);
  const totalFarmingCost = entries.reduce(
    (s, e) => s + totalCost(e.gas_usd, e.fees_usd),
    0
  );
  const totalPoints = entries.reduce((s, e) => s + (e.points ?? 0), 0);

  // Aggregate by project
  const byProject = new Map<string, { name: string; type: string; entries: typeof entries }>();
  for (const e of entries) {
    const key = e.project_id;
    if (!byProject.has(key)) {
      byProject.set(key, { name: e.project_name, type: e.project_type, entries: [] });
    }
    byProject.get(key)!.entries.push(e);
  }

  const projectRows = Array.from(byProject.entries()).map(([id, { name, type, entries: es }]) => {
    const agg = aggregateEntries(es);
    const cost = totalCost(agg.gas_usd, agg.fees_usd);
    return {
      id,
      name,
      type,
      volume_usd: agg.volume_usd,
      cost_usd: cost,
      points: agg.points,
      cost_per_point: costPerPoint(agg.gas_usd, agg.fees_usd, agg.points),
      cost_per_m_vol: costPerMVolume(agg.gas_usd, agg.fees_usd, agg.volume_usd),
      initial_liq_usd: agg.initial_liq_usd,
    };
  });

  return NextResponse.json({
    total_portfolio_usd: totalPortfolioUsd,
    total_farming_cost: totalFarmingCost,
    total_points: totalPoints,
    wallet_count: wallets.length,
    project_rows: projectRows,
  });
}
