import { notFound } from "next/navigation";
import { getProject } from "@/lib/repo/projects";
import { listByProject } from "@/lib/repo/walletProjects";
import { aggregateEntries, costPerPoint, costPerMVolume, totalCost } from "@/lib/metrics";
import { fmtUsd, fmtNumber, fmtPercent, truncateAddress } from "@/lib/format";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const entries = listByProject(id);
  const agg = aggregateEntries(entries);
  const totalCostVal = totalCost(agg.gas_usd, agg.fees_usd, agg.pnl_usd);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <Badge variant="outline">{project.type}</Badge>
          </div>
          {project.url && (
            <a href={project.url} target="_blank" rel="noopener noreferrer"
               className="text-sm text-blue-500 hover:underline mt-1 block">{project.url}</a>
          )}
          {project.notes && <p className="text-sm text-muted-foreground mt-1">{project.notes}</p>}
        </div>
      </div>

      {/* Aggregate KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {project.type === "PERP" && (
          <KpiCard label="Total volume" value={fmtUsd(agg.volume_usd, 0)} />
        )}
        {project.type === "LP" && (
          <KpiCard label="Init liquidity" value={fmtUsd(agg.initial_liq_usd)} />
        )}
        <KpiCard label="Total cost" value={fmtUsd(totalCostVal)} />
        <KpiCard label="Total points" value={fmtNumber(agg.points, 0)} />
        <KpiCard label="$/point" value={fmtUsd(costPerPoint(agg.gas_usd, agg.fees_usd, agg.points, agg.pnl_usd))} />
        {project.type === "PERP" && (
          <KpiCard label="$/$1M vol" value={fmtUsd(costPerMVolume(agg.gas_usd, agg.fees_usd, agg.volume_usd, agg.pnl_usd))} />
        )}
      </div>

      {entries.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wallet</TableHead>
                <TableHead>Address</TableHead>
                {project.type === "PERP" && <TableHead className="text-right">Volume</TableHead>}
                {project.type === "PERP" && <TableHead className="text-right">Fees</TableHead>}
                {project.type === "LP" && <TableHead className="text-right">Init liq.</TableHead>}
                {project.type === "LP" && <TableHead className="text-right">APR</TableHead>}
                <TableHead className="text-right">Gas</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">$/point</TableHead>
                {project.type === "PERP" && <TableHead className="text-right">$/$1M vol</TableHead>}
                <TableHead>Custom</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => {
                const cost = totalCost(e.gas_usd, e.fees_usd, e.pnl_usd);
                let custom: Record<string, string> = {};
                try { custom = JSON.parse(e.custom_fields); } catch { /* skip */ }
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      <a href={`/wallets/${e.wallet_address}`} className="hover:underline">{e.wallet_label}</a>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {truncateAddress(e.wallet_address)}
                    </TableCell>
                    {project.type === "PERP" && <TableCell className="text-right">{fmtUsd(e.volume_usd)}</TableCell>}
                    {project.type === "PERP" && <TableCell className="text-right">{fmtUsd(e.fees_usd)}</TableCell>}
                    {project.type === "LP" && <TableCell className="text-right">{fmtUsd(e.initial_liq_usd)}</TableCell>}
                    {project.type === "LP" && <TableCell className="text-right">{fmtPercent(e.current_apr)}</TableCell>}
                    <TableCell className="text-right">{fmtUsd(e.gas_usd)}</TableCell>
                    <TableCell className="text-right">{fmtNumber(e.points, 0)}</TableCell>
                    <TableCell className="text-right">{fmtUsd(cost)}</TableCell>
                    <TableCell className="text-right">{fmtUsd(costPerPoint(e.gas_usd, e.fees_usd, e.points, e.pnl_usd))}</TableCell>
                    {project.type === "PERP" && (
                      <TableCell className="text-right">{fmtUsd(costPerMVolume(e.gas_usd, e.fees_usd, e.volume_usd, e.pnl_usd))}</TableCell>
                    )}
                    <TableCell className="text-xs text-muted-foreground">
                      {Object.entries(custom).map(([k, v]) => `${k}=${v}`).join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Totals row */}
              <TableRow className="font-semibold bg-muted/40">
                <TableCell colSpan={2}>Total</TableCell>
                {project.type === "PERP" && <TableCell className="text-right">{fmtUsd(agg.volume_usd, 0)}</TableCell>}
                {project.type === "PERP" && <TableCell className="text-right">{fmtUsd(agg.fees_usd)}</TableCell>}
                {project.type === "LP" && <TableCell className="text-right">{fmtUsd(agg.initial_liq_usd)}</TableCell>}
                {project.type === "LP" && <TableCell />}
                <TableCell className="text-right">{fmtUsd(agg.gas_usd)}</TableCell>
                <TableCell className="text-right">{fmtNumber(agg.points, 0)}</TableCell>
                <TableCell className="text-right">{fmtUsd(totalCostVal)}</TableCell>
                <TableCell className="text-right">{fmtUsd(costPerPoint(agg.gas_usd, agg.fees_usd, agg.points, agg.pnl_usd))}</TableCell>
                {project.type === "PERP" && (
                  <TableCell className="text-right">{fmtUsd(costPerMVolume(agg.gas_usd, agg.fees_usd, agg.volume_usd, agg.pnl_usd))}</TableCell>
                )}
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No wallet entries for this project yet. Add them from a wallet page.</p>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
