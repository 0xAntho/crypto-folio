import { notFound } from "next/navigation";
import { getWalletByAddress, getBalanceCache } from "@/lib/repo/wallets";
import { listByWallet } from "@/lib/repo/walletProjects";
import { listProjects } from "@/lib/repo/projects";
import { fmtUsd, fmtNumber, fmtPercent, timeAgo } from "@/lib/format";
import { costPerPoint, costPerMVolume, totalCost } from "@/lib/metrics";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import WalletActions from "@/components/wallet/WalletActions";
import FarmingEntryDialog from "@/components/projects/FarmingEntryDialog";
import SyncEntryButton from "@/components/wallet/SyncEntryButton";
import HoldingsList from "@/components/wallet/HoldingsList";
import DefiPositionsList from "@/components/wallet/DefiPositionsList";
import SyncAllFarmingButton from "@/components/wallet/SyncAllFarmingButton";

interface Props {
  params: Promise<{ address: string }>;
}

interface RawDefiPos {
  attributes: {
    position_type: "deposit" | "loan" | "staked" | "locked" | "reward" | "investment";
    value: number | null;
    quantity: { float: number };
    price: number | null;
    fungible_info: { name: string; symbol: string };
    application_metadata: { name: string } | null;
  };
  relationships: { chain: { data: { id: string } } };
}

export default async function WalletPage({ params }: Props) {
  const { address } = await params;
  const wallet = getWalletByAddress(address);
  if (!wallet) notFound();

  const cache = getBalanceCache(wallet.id);
  const entries = listByWallet(wallet.id);
  const allProjects = listProjects();

  let positions: Array<{
    name: string; symbol: string; qty: number; value: number | null;
    price: number | null; change1d: number | null; change1d_usd: number | null; chain: string;
  }> = [];

  let chainByValue: [string, number][] = [];

  let defiPositions: Array<{
    protocol: string; symbol: string; type: string; chain: string;
    qty: number; value: number | null; price: number | null;
  }> = [];

  if (cache) {
    try {
      const parsed = JSON.parse(cache.payload);
      positions = (parsed.positions?.data ?? []).map((p: {
        attributes: {
          name: string;
          quantity: { float: number };
          value: number | null;
          price: number | null;
          changes: { percent_1d: number | null } | null;
          fungible_info: { name: string; symbol: string; implementations: Array<{ chain_id: string }> };
        };
        relationships: { chain: { data: { id: string } } };
      }) => {
        const change1d = p.attributes.changes?.percent_1d ?? null;
        const value = p.attributes.value;
        return {
          name: p.attributes.fungible_info.name,
          symbol: p.attributes.fungible_info.symbol,
          qty: p.attributes.quantity.float,
          value,
          price: p.attributes.price,
          change1d,
          change1d_usd: value != null && change1d != null ? value * (change1d / 100) : null,
          chain: p.relationships.chain.data.id,
        };
      });

      const rawDefi = (parsed.defiPositions?.data ?? []) as RawDefiPos[];
      defiPositions = rawDefi.map((p) => ({
        protocol: p.attributes.application_metadata?.name ?? "Unknown",
        symbol: p.attributes.fungible_info.symbol,
        type: p.attributes.position_type,
        chain: p.relationships.chain.data.id,
        qty: p.attributes.quantity.float,
        value: p.attributes.value,
        price: p.attributes.price,
      })).filter((p) => (p.value ?? 0) > 1)
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

      const chainMap = new Map<string, number>();
      for (const p of positions) {
        chainMap.set(p.chain, (chainMap.get(p.chain) ?? 0) + (p.value ?? 0));
      }
      for (const p of defiPositions) {
        const v = p.type === "loan" ? -(p.value ?? 0) : (p.value ?? 0);
        chainMap.set(p.chain, (chainMap.get(p.chain) ?? 0) + v);
      }
      chainByValue = Array.from(chainMap)
        .filter(([, v]) => v >= 50)
        .sort((a, b) => b[1] - a[1]);
    } catch {
      // malformed cache, ignore
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{wallet.label}</h1>
          <p className="text-sm text-muted-foreground font-mono">{wallet.address}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xl font-semibold">{fmtUsd(wallet.total_usd, 0)}</p>
            {cache && (
              <p className="text-xs text-muted-foreground">Synced {timeAgo(cache.fetched_at)}</p>
            )}
          </div>
          <WalletActions walletId={wallet.id} address={wallet.address} label={wallet.label} />
        </div>
      </div>

      {/* Holdings */}
      {positions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Holdings</h2>
          <HoldingsList positions={positions} chainBreakdown={chainByValue} />
        </div>
      )}

      {/* DeFi Positions */}
      {defiPositions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">DeFi Positions</h2>
          <DefiPositionsList positions={defiPositions} />
        </div>
      )}

      {/* Farming */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Farming</h2>
          <div className="flex items-center gap-2">
            <SyncAllFarmingButton entryIds={entries.filter(e => e.project_sync_adapter).map(e => e.id)} />
            <FarmingEntryDialog walletId={wallet.id} projects={allProjects} existingIds={entries.map(e => e.project_id)} />
          </div>
        </div>
        {entries.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/40 [&_th]:font-semibold">
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Init liq.</TableHead>
                  <TableHead className="text-right">APR</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">PnL</TableHead>
                  <TableHead className="text-right">$/point</TableHead>
                  <TableHead className="text-right">$/$1M vol</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => {
                  const cost = totalCost(e.gas_usd, e.fees_usd, e.pnl_usd);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">
                        <a href={`/projects/${e.project_id}`} className="hover:underline">{e.project_name}</a>
                      </TableCell>
                      <TableCell><Badge variant="outline" className={typeColor(e.project_type)}>{e.project_type}</Badge></TableCell>
                      <TableCell className="text-right">{fmtUsd(e.volume_usd)}</TableCell>
                      <TableCell className="text-right">{fmtUsd(e.initial_liq_usd)}</TableCell>
                      <TableCell className="text-right">{fmtPercent(e.current_apr)}</TableCell>
                      <TableCell className="text-right">{fmtUsd(cost)}</TableCell>
                      <TableCell className="text-right">{fmtNumber(e.points, 0)}</TableCell>
                      <TableCell className="text-right">{fmtUsd(e.fees_usd)}</TableCell>
                      <TableCell className={`text-right ${e.pnl_usd != null ? (e.pnl_usd >= 0 ? "text-green-600" : "text-red-500") : ""}`}>
                        {fmtUsd(e.pnl_usd)}
                      </TableCell>
                      <TableCell className="text-right">{fmtUsd(costPerPoint(e.gas_usd, e.fees_usd, e.points, e.pnl_usd))}</TableCell>
                      <TableCell className="text-right">{fmtUsd(costPerMVolume(e.gas_usd, e.fees_usd, e.volume_usd, e.pnl_usd))}</TableCell>
                      <TableCell className="flex items-center gap-1">
                        {e.project_sync_adapter && <SyncEntryButton entryId={e.id} />}
                        <FarmingEntryDialog
                          walletId={wallet.id}
                          projects={allProjects}
                          existingIds={[]}
                          editEntry={e}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No farming entries yet.</p>
        )}
      </div>
    </div>
  );
}


function typeColor(type: string) {
  if (type === "PERP") return "border-blue-400/40 bg-blue-400/10 text-blue-500";
  if (type === "LP") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-500";
  return "border-muted-foreground/30 text-muted-foreground";
}
