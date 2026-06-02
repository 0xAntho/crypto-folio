import { notFound } from "next/navigation";
import { getWalletByAddress, getBalanceCache } from "@/lib/repo/wallets";
import { listManualHoldings } from "@/lib/repo/manualHoldings";
import { listHiddenKeys } from "@/lib/repo/hiddenPositions";
import { getHLSpotCache } from "@/lib/repo/hlSpotCache";
import { getPositionOverrides } from "@/lib/repo/positionOverrides";
import type { HLSpotPosition } from "@/lib/hyperliquid";
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
  const overrides = getPositionOverrides(wallet.id);
  const entries = listByWallet(wallet.id);
  const allProjects = listProjects();

  let positions: Array<{
    name: string; symbol: string; qty: number; value: number | null;
    price: number | null; change1d: number | null; change1d_usd: number | null; chain: string;
    isManual?: boolean; holdingId?: string; positionKey?: string;
  }> = [];
  let hiddenValue = 0;

  let chainByValue: [string, number][] = [];

  let defiPositions: Array<{
    protocol: string; symbol: string; type: string; chain: string;
    qty: number; value: number | null; price: number | null;
  }> = [];

  const hiddenKeys = listHiddenKeys(wallet.id);

  if (cache) {
    try {
      const parsed = JSON.parse(cache.payload);
      const rawPositions = (parsed.positions?.data ?? []) as Array<{
        attributes: {
          name: string;
          quantity: { float: number };
          value: number | null;
          price: number | null;
          changes: { percent_1d: number | null } | null;
          fungible_info: { name: string; symbol: string; implementations: Array<{ chain_id: string }> };
        };
        relationships: { chain: { data: { id: string } } };
      }>;
      for (const p of rawPositions) {
        const symbol = p.attributes.fungible_info.symbol;
        const chain = p.relationships.chain.data.id;
        const key = `${symbol}:${chain}`;
        if (hiddenKeys.has(key)) {
          hiddenValue += p.attributes.value ?? 0;
          continue;
        }
        const override = overrides.get(key);
        const qty = override?.qty_override ?? p.attributes.quantity.float;
        const price = override?.price_override ?? p.attributes.price;
        const change1d = p.attributes.changes?.percent_1d ?? null;
        const value = price != null ? qty * price : null;
        positions.push({
          name: p.attributes.fungible_info.name,
          symbol,
          qty,
          value,
          price,
          change1d,
          change1d_usd: value != null && change1d != null ? value * (change1d / 100) : null,
          chain,
          positionKey: key,
        });
      }

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

    } catch {
      // malformed cache, ignore
    }
  }

  const manualHoldings = listManualHoldings(wallet.id);
  let manualValue = 0;
  for (const h of manualHoldings) {
    const value = h.price != null ? h.qty * h.price : null;
    manualValue += value ?? 0;
    positions.push({
      name: h.name,
      symbol: h.symbol,
      qty: h.qty,
      value,
      price: h.price,
      change1d: null,
      change1d_usd: null,
      chain: h.chain,
      isManual: true,
      holdingId: h.id,
    });
  }

  const hlCache = getHLSpotCache(wallet.id);
  let hlValue = 0;
  if (hlCache) {
    try {
      const hlPositions = JSON.parse(hlCache.payload) as HLSpotPosition[];
      for (const p of hlPositions) {
        const key = `${p.symbol}:hyperliquid`;
        if (hiddenKeys.has(key)) continue;
        const override = overrides.get(key);
        const qty = override?.qty_override ?? p.qty;
        const price = override?.price_override ?? p.price;
        const value = price != null ? qty * price : null;
        hlValue += value ?? 0;
        positions.push({
          name: p.symbol,
          symbol: p.symbol,
          qty,
          value,
          price,
          change1d: p.change1d,
          change1d_usd: value != null && p.change1d != null ? value * (p.change1d / 100) : null,
          chain: "hyperliquid",
          positionKey: key,
        });
      }
    } catch {
      // malformed cache, ignore
    }
  }

  const adjustedTotal = (wallet.total_usd ?? 0) - hiddenValue + manualValue + hlValue;

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{wallet.label}</h1>
          <p className="text-sm text-muted-foreground font-mono">{wallet.address}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xl font-semibold">{fmtUsd(adjustedTotal, 0)}</p>
            {cache && (
              <p className="text-xs text-muted-foreground">Synced {timeAgo(cache.fetched_at)}</p>
            )}
          </div>
          <WalletActions walletId={wallet.id} address={wallet.address} label={wallet.label} />
        </div>
      </div>

      {/* Holdings */}
      <div className="space-y-3">
        <HoldingsList walletId={wallet.id} positions={positions} chainBreakdown={chainByValue} />
      </div>

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
