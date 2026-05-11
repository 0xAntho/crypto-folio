import { listWallets } from "@/lib/repo/wallets";
import { listAll } from "@/lib/repo/walletProjects";
import { listProjects } from "@/lib/repo/projects";
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

export default function DashboardPage() {
  const wallets = listWallets();
  const entries = listAll();
  const projects = listProjects();

  const totalPortfolioUsd = wallets.reduce((s, w) => s + (w.total_usd ?? 0), 0);
  const totalFarmingCost = entries.reduce((s, e) => s + totalCost(e.gas_usd, e.fees_usd), 0);
  const totalPoints = entries.reduce((s, e) => s + (e.points ?? 0), 0);

  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const byProject = new Map<string, typeof entries>();
  for (const e of entries) {
    if (!byProject.has(e.project_id)) byProject.set(e.project_id, []);
    byProject.get(e.project_id)!.push(e);
  }

  const rows = Array.from(byProject.entries()).map(([pid, es]) => {
    const proj = projectMap.get(pid);
    const agg = aggregateEntries(es);
    const cost = totalCost(agg.gas_usd, agg.fees_usd);
    return {
      id: pid,
      name: proj?.name ?? pid,
      type: proj?.type ?? "OTHER",
      volume_usd: agg.volume_usd,
      cost_usd: cost,
      points: agg.points,
      cost_per_point: costPerPoint(agg.gas_usd, agg.fees_usd, agg.points),
      cost_per_m_vol: costPerMVolume(agg.gas_usd, agg.fees_usd, agg.volume_usd),
      initial_liq_usd: agg.initial_liq_usd,
    };
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <SyncAllButton wallets={wallets.map((w) => ({ id: w.id, label: w.label }))} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Portfolio" value={fmtUsd(totalPortfolioUsd, 0)} />
        <KpiCard label="Wallets" value={String(wallets.length)} />
        <KpiCard label="Farm spend" value={fmtUsd(totalFarmingCost)} />
        <KpiCard label="Total points" value={fmtNumber(totalPoints, 0)} />
      </div>

      {rows.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Farming projects</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
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
                      <Badge variant="outline">{r.type}</Badge>
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

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
