import { listWallets, listPositionsByWallet } from "@/lib/repo/wallets";
import { listAll } from "@/lib/repo/walletProjects";
import { listProjects } from "@/lib/repo/projects";
import { listHistory } from "@/lib/repo/portfolio";
import { aggregateEntries, costPerPoint, costPerMVolume, totalCost } from "@/lib/metrics";
import { fmtUsd, fmtNumber } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import SyncAllButton from "@/components/dashboard/SyncAllButton";
import AssetPieChart, { type AssetSlice } from "@/components/dashboard/AssetPieChart";
import FarmingCostChart, { type ProjectCostSlice } from "@/components/dashboard/FarmingCostChart";
import PortfolioChart from "@/components/dashboard/PortfolioChart";
import type { ZerionPosition, ZerionPositionsResponse } from "@/lib/zerion";

export default function DashboardPage() {
  const wallets = listWallets();
  const entries = listAll();
  const projects = listProjects();
  const payloads = listPositionsByWallet();
  const history = listHistory();

  const totalPortfolioUsd = wallets.reduce((s, w) => s + (w.total_usd ?? 0), 0);
  const totalFarmingCost = entries.reduce((s, e) => s + totalCost(e.gas_usd, e.fees_usd, e.pnl_usd), 0);
  const totalPoints = entries.reduce((s, e) => s + (e.points ?? 0), 0);

  // Build per-wallet positions map for sync snapshot
  const positionsByWalletId = new Map<string, ZerionPosition[]>();
  for (const row of payloads) {
    if (!row.payload) continue;
    try {
      const parsed = JSON.parse(row.payload) as { positions: ZerionPositionsResponse };
      positionsByWalletId.set(row.wallet_id, parsed.positions.data ?? []);
    } catch {
      // malformed cache entry — skip
    }
  }

  // Aggregate positions across all wallets for pie chart
  const bySymbol = new Map<string, { value: number }>();
  for (const positions of positionsByWalletId.values()) {
    for (const pos of positions) {
      const symbol = pos.attributes.fungible_info.symbol;
      const value = pos.attributes.value ?? 0;
      if (value <= 0) continue;
      const existing = bySymbol.get(symbol);
      if (existing) existing.value += value;
      else bySymbol.set(symbol, { value });
    }
  }

  const sorted = Array.from(bySymbol.entries())
    .map(([symbol, { value }]) => ({ symbol, value }))
    .sort((a, b) => b.value - a.value);

  const TOP_N = 6;
  const top = sorted.slice(0, TOP_N);
  const othersValue = sorted.slice(TOP_N).reduce((s, t) => s + t.value, 0);
  const total = sorted.reduce((s, t) => s + t.value, 0);

  const pieSlices: AssetSlice[] = [
    ...top.map((t) => ({ symbol: t.symbol, value: t.value, pct: total > 0 ? (t.value / total) * 100 : 0 })),
    ...(othersValue > 0 ? [{ symbol: "Others", value: othersValue, pct: total > 0 ? (othersValue / total) * 100 : 0 }] : []),
  ];

  const walletSnapshots = wallets.map((w) => ({
    id: w.id,
    label: w.label,
    totalUsd: w.total_usd ?? 0,
    positions: positionsByWalletId.get(w.id) ?? [],
  }));

  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const byProject = new Map<string, typeof entries>();
  for (const e of entries) {
    if (!byProject.has(e.project_id)) byProject.set(e.project_id, []);
    byProject.get(e.project_id)!.push(e);
  }

  const rows = Array.from(byProject.entries()).map(([pid, es]) => {
    const proj = projectMap.get(pid);
    const agg = aggregateEntries(es);
    const cost = totalCost(agg.gas_usd, agg.fees_usd, agg.pnl_usd);
    return {
      id: pid,
      name: proj?.name ?? pid,
      type: proj?.type ?? "OTHER",
      volume_usd: agg.volume_usd,
      cost_usd: cost,
      fees_usd: agg.fees_usd,
      gas_usd: agg.gas_usd,
      pnl_usd: agg.pnl_usd,
      points: agg.points,
      cost_per_point: costPerPoint(agg.gas_usd, agg.fees_usd, agg.points, agg.pnl_usd),
      cost_per_m_vol: costPerMVolume(agg.gas_usd, agg.fees_usd, agg.volume_usd, agg.pnl_usd),
      initial_liq_usd: agg.initial_liq_usd,
    };
  });

  const farmingCostSlices: ProjectCostSlice[] = rows.map((r) => ({
    name: r.name,
    fees: r.fees_usd,
    gas: r.gas_usd,
    pnl: r.pnl_usd,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <SyncAllButton wallets={walletSnapshots} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Portfolio" value={fmtUsd(totalPortfolioUsd, 0)} />
        <KpiCard label="Wallets" value={String(wallets.length)} />
        <KpiCard label="Farm spend" value={fmtUsd(totalFarmingCost)} />
        <KpiCard label="Total points" value={fmtNumber(totalPoints, 0)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <AssetPieChart slices={pieSlices} />
        <FarmingCostChart data={farmingCostSlices} />
      </div>

      <PortfolioChart data={history} />

      {rows.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Farming projects</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/40 [&_th]:font-semibold">
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Init liq.</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">$/point</TableHead>
                  <TableHead className="text-right">$/$1M vol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <a href={`/projects/${r.id}`} className="hover:underline">{r.name}</a>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={typeColor(r.type)}>{r.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{fmtUsd(r.volume_usd || null)}</TableCell>
                    <TableCell className="text-right">{fmtUsd(r.initial_liq_usd || null)}</TableCell>
                    <TableCell className="text-right">{fmtUsd(r.cost_usd)}</TableCell>
                    <TableCell className="text-right">{fmtNumber(r.points, 0)}</TableCell>
                    <TableCell className="text-right">{fmtUsd(r.cost_per_point)}</TableCell>
                    <TableCell className="text-right">{fmtUsd(r.cost_per_m_vol)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {wallets.length === 0 && (
        <p className="text-muted-foreground text-sm">Add a wallet from the sidebar to get started.</p>
      )}
    </div>
  );
}

function typeColor(type: string) {
  if (type === "PERP") return "border-blue-400/40 bg-blue-400/10 text-blue-500";
  if (type === "LP") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-500";
  return "border-muted-foreground/30 text-muted-foreground";
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
