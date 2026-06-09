"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { fmtUsd } from "@/lib/format";
import type { ZerionPosition } from "@/lib/zerion";

interface WalletSnapshot {
  id: string;
  label: string;
  totalUsd: number;
  positions: ZerionPosition[];
}

interface TokenDelta {
  symbol: string;
  delta: number;
}

interface FarmingEntry {
  id: string;
  name: string;
  type: string;
  volume_usd: number | null;
  pnl_usd: number | null;
}

interface FarmingRecap {
  name: string;
  type: string;
  volume_delta: number | null;
  pnl_delta: number | null;
}

interface RecapData {
  totalBefore: number;
  totalAfter: number;
  gainers: TokenDelta[];
  losers: TokenDelta[];
  farming: FarmingRecap[];
}

function aggregateBySymbol(snapshots: WalletSnapshot[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of snapshots) {
    for (const pos of s.positions) {
      const symbol = pos.attributes.fungible_info.symbol;
      const value = pos.attributes.value ?? 0;
      map.set(symbol, (map.get(symbol) ?? 0) + value);
    }
  }
  return map;
}

interface Props {
  wallets: WalletSnapshot[];
  farmingEntries: FarmingEntry[];
}

export default function SyncAllButton({ wallets, farmingEntries }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [recap, setRecap] = useState<RecapData | null>(null);

  async function syncAll() {
    setLoading(true);
    const oldBySymbol = aggregateBySymbol(wallets);
    const totalBefore = wallets.reduce((s, w) => s + w.totalUsd, 0);

    console.log(`[sync-all] syncing ${wallets.length} wallet(s)`);
    const results: WalletSnapshot[] = [];
    for (const w of wallets) {
      const res = await fetch(`/api/wallets/${w.id}/sync`, { method: "POST" });
      console.log(`[sync-all] wallet ${w.label} (${w.id}) status=${res.status}`);
      if (res.ok) {
        const data = await res.json();
        results.push({ ...w, totalUsd: data.total_usd ?? w.totalUsd, positions: data.positions ?? [] });
      } else {
        console.error(`[sync-all] wallet ${w.label} sync failed:`, await res.json().catch(() => res.statusText));
        results.push(w);
      }
    }

    const newBySymbol = aggregateBySymbol(results);
    const totalAfter = results.reduce((s, w) => s + w.totalUsd, 0);

    const deltas: TokenDelta[] = [];
    const allSymbols = new Set([...oldBySymbol.keys(), ...newBySymbol.keys()]);
    for (const symbol of allSymbols) {
      const delta = (newBySymbol.get(symbol) ?? 0) - (oldBySymbol.get(symbol) ?? 0);
      if (Math.abs(delta) >= 0.01) deltas.push({ symbol, delta });
    }
    deltas.sort((a, b) => b.delta - a.delta);

    const farmingByName = new Map<string, FarmingRecap>();
    for (const entry of farmingEntries) {
      const res = await fetch(`/api/wallet-projects/${entry.id}/sync`, { method: "POST" });
      console.log(`[sync-all] farming entry ${entry.id} status=${res.status}`);
      if (res.ok) {
        const data = await res.json();
        const volDelta = data.volume_usd != null ? (data.volume_usd - (entry.volume_usd ?? 0)) : null;
        const pnlDelta = data.pnl_usd != null ? (data.pnl_usd - (entry.pnl_usd ?? 0)) : null;
        const existing = farmingByName.get(entry.name);
        if (existing) {
          existing.volume_delta = (existing.volume_delta ?? 0) + (volDelta ?? 0);
          existing.pnl_delta = (existing.pnl_delta ?? 0) + (pnlDelta ?? 0);
        } else {
          farmingByName.set(entry.name, {
            name: entry.name,
            type: entry.type,
            volume_delta: volDelta,
            pnl_delta: pnlDelta,
          });
        }
      } else {
        console.error(`[sync-all] farming entry ${entry.id} sync failed:`, await res.json().catch(() => res.statusText));
      }
    }

    const farming = Array.from(farmingByName.values())
      .filter((f) => f.volume_delta != null && f.volume_delta > 0)
      .sort((a, b) => (b.pnl_delta ?? 0) - (a.pnl_delta ?? 0));

    const [snapshotRes, projectsRes] = await Promise.all([
      fetch("/api/portfolio/snapshot", { method: "POST" }),
      fetch("/api/projects/snapshot", { method: "POST" }),
    ]);
    console.log(`[sync-all] portfolio snapshot status=${snapshotRes.status} projects snapshot status=${projectsRes.status}`);

    setRecap({
      totalBefore,
      totalAfter,
      gainers: deltas.filter((d) => d.delta > 0).slice(0, 3),
      losers: deltas.filter((d) => d.delta < 0).slice(-3).reverse(),
      farming,
    });

    setLoading(false);
    router.refresh();
  }

  const portfolioDelta = recap ? recap.totalAfter - recap.totalBefore : 0;
  const hasFarming = recap && recap.farming.length > 0;

  return (
    <>
      <Button variant="outline" size="sm" onClick={syncAll} disabled={loading}>
        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
        Sync all
      </Button>

      <Dialog open={recap !== null} onOpenChange={(open) => !open && setRecap(null)}>
        <DialogContent className={hasFarming ? "max-w-2xl" : "max-w-sm"}>
          <DialogHeader>
            <DialogTitle>Sync complete</DialogTitle>
          </DialogHeader>
          {recap && (
            <div className={hasFarming ? "grid grid-cols-2 gap-6" : undefined}>
              <div className="space-y-4 text-sm">
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Portfolio</p>
                  <p className="text-lg font-semibold">{fmtUsd(recap.totalAfter, 0)}</p>
                  <p className={portfolioDelta >= 0 ? "text-emerald-500" : "text-red-500"}>
                    {portfolioDelta >= 0 ? "+" : ""}{fmtUsd(portfolioDelta, 0)}
                  </p>
                </div>

                {recap.gainers.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-500" /> Top gainers
                    </p>
                    {recap.gainers.map((g) => (
                      <div key={g.symbol} className="flex justify-between">
                        <span className="font-medium">{g.symbol}</span>
                        <span className="text-emerald-500">+{fmtUsd(g.delta, 0)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {recap.losers.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-red-500" /> Top losers
                    </p>
                    {recap.losers.map((g) => (
                      <div key={g.symbol} className="flex justify-between">
                        <span className="font-medium">{g.symbol}</span>
                        <span className="text-red-500">{fmtUsd(g.delta, 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {hasFarming && (
                <div className="space-y-3 text-sm border-l pl-6">
                  <p className="text-xs text-muted-foreground">Farming</p>
                  {recap.farming.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No trades done since last sync</p>
                  ) : recap.farming.map((f) => (
                    <div key={f.name} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{f.name}</span>
                        <Badge variant="outline" className={typeColor(f.type)}>{f.type}</Badge>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Volume</span>
                        <span className="text-foreground">{fmtUsd(f.volume_delta)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>PnL</span>
                        <span className={f.pnl_delta != null && f.pnl_delta >= 0 ? "text-emerald-500" : "text-red-500"}>
                          {f.pnl_delta != null && f.pnl_delta >= 0 ? "+" : ""}{fmtUsd(f.pnl_delta)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function typeColor(type: string) {
  if (type === "PERP") return "border-blue-400/40 bg-blue-400/10 text-blue-500";
  if (type === "LP") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-500";
  return "border-muted-foreground/30 text-muted-foreground";
}
