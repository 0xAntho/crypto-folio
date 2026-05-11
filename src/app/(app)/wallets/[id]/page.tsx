import { notFound } from "next/navigation";
import { getWallet, getBalanceCache } from "@/lib/repo/wallets";
import { listByWallet } from "@/lib/repo/walletProjects";
import { listProjects } from "@/lib/repo/projects";
import { fmtUsd, fmtNumber, fmtPercent, truncateAddress, timeAgo } from "@/lib/format";
import { costPerPoint, costPerMVolume, totalCost } from "@/lib/metrics";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import WalletActions from "@/components/wallet/WalletActions";
import FarmingEntryDialog from "@/components/projects/FarmingEntryDialog";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WalletPage({ params }: Props) {
  const { id } = await params;
  const wallet = getWallet(id);
  if (!wallet) notFound();

  const cache = getBalanceCache(id);
  const entries = listByWallet(id);
  const allProjects = listProjects();

  let positions: Array<{
    name: string; symbol: string; qty: number; value: number | null;
    price: number | null; change1d: number | null; chain: string;
  }> = [];

  if (cache) {
    try {
      const parsed = JSON.parse(cache.payload);
      positions = (parsed.positions?.data ?? []).map((p: {
        attributes: {
          name: string; symbol: string;
          quantity: { float: number };
          value: number | null;
          price: number | null;
          changes: { percent_1d: number | null } | null;
          fungible_info: { implementations: Array<{ chain_id: string }> };
        }
      }) => ({
        name: p.attributes.name,
        symbol: p.attributes.symbol,
        qty: p.attributes.quantity.float,
        value: p.attributes.value,
        price: p.attributes.price,
        change1d: p.attributes.changes?.percent_1d ?? null,
        chain: p.attributes.fungible_info.implementations[0]?.chain_id ?? "",
      }));
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
          <WalletActions walletId={id} address={wallet.address} />
        </div>
      </div>

      {/* Holdings */}
      {positions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Holdings</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Chain</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">24h</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <span className="font-medium">{p.symbol}</span>
                      <span className="text-xs text-muted-foreground ml-2">{p.name}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.chain}</TableCell>
                    <TableCell className="text-right">{fmtUsd(p.price, 4)}</TableCell>
                    <TableCell className="text-right">{fmtNumber(p.qty, 4)}</TableCell>
                    <TableCell className="text-right">{fmtUsd(p.value)}</TableCell>
                    <TableCell className={`text-right text-sm ${(p.change1d ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {fmtPercent(p.change1d)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Farming */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Farming</h2>
          <FarmingEntryDialog walletId={id} projects={allProjects} existingIds={entries.map(e => e.project_id)} />
        </div>
        {entries.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Init liq.</TableHead>
                  <TableHead className="text-right">APR</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">$/point</TableHead>
                  <TableHead className="text-right">$/$1M vol</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => {
                  const cost = totalCost(e.gas_usd, e.fees_usd);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">
                        <a href={`/projects/${e.project_id}`} className="hover:underline">{e.project_name}</a>
                      </TableCell>
                      <TableCell><Badge variant="outline">{e.project_type}</Badge></TableCell>
                      <TableCell className="text-right">{fmtUsd(e.volume_usd)}</TableCell>
                      <TableCell className="text-right">{fmtUsd(e.initial_liq_usd)}</TableCell>
                      <TableCell className="text-right">{fmtPercent(e.current_apr)}</TableCell>
                      <TableCell className="text-right">{fmtUsd(cost)}</TableCell>
                      <TableCell className="text-right">{fmtNumber(e.points, 0)}</TableCell>
                      <TableCell className="text-right">{fmtUsd(costPerPoint(e.gas_usd, e.fees_usd, e.points))}</TableCell>
                      <TableCell className="text-right">{fmtUsd(costPerMVolume(e.gas_usd, e.fees_usd, e.volume_usd))}</TableCell>
                      <TableCell>
                        <FarmingEntryDialog
                          walletId={id}
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
