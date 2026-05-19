"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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

interface RecapData {
  totalBefore: number;
  totalAfter: number;
  gainers: TokenDelta[];
  losers: TokenDelta[];
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
}

export default function SyncAllButton({ wallets }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [recap, setRecap] = useState<RecapData | null>(null);

  async function syncAll() {
    setLoading(true);
    const oldBySymbol = aggregateBySymbol(wallets);
    const totalBefore = wallets.reduce((s, w) => s + w.totalUsd, 0);

    const results: WalletSnapshot[] = [];
    for (const w of wallets) {
      const res = await fetch(`/api/wallets/${w.id}/sync`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        results.push({ ...w, totalUsd: data.total_usd ?? w.totalUsd, positions: data.positions ?? [] });
      } else {
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

    setRecap({
      totalBefore,
      totalAfter,
      gainers: deltas.filter((d) => d.delta > 0).slice(0, 3),
      losers: deltas.filter((d) => d.delta < 0).slice(-3).reverse(),
    });

    await fetch("/api/portfolio/snapshot", { method: "POST" });

    setLoading(false);
    router.refresh();
  }

  const portfolioDelta = recap ? recap.totalAfter - recap.totalBefore : 0;

  return (
    <>
      <Button variant="outline" size="sm" onClick={syncAll} disabled={loading}>
        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
        Sync all
      </Button>

      <Dialog open={recap !== null} onOpenChange={(open) => !open && setRecap(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sync complete</DialogTitle>
          </DialogHeader>
          {recap && (
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
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
