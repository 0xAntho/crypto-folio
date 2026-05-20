"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { fmtUsd, fmtNumber, fmtPercent } from "@/lib/format";

interface Position {
  name: string;
  symbol: string;
  qty: number;
  value: number | null;
  price: number | null;
  change1d: number | null;
  change1d_usd: number | null;
  chain: string;
}

const PAGE_SIZE = 5;

export default function HoldingsList({ positions, chainBreakdown }: { positions: Position[]; chainBreakdown?: [string, number][] }) {
  const [showAll, setShowAll] = useState(false);
  const [selectedChain, setSelectedChain] = useState<string | null>(null);

  const chains = chainBreakdown ?? Array.from(
    positions.reduce((map, p) => {
      map.set(p.chain, (map.get(p.chain) ?? 0) + (p.value ?? 0));
      return map;
    }, new Map<string, number>())
  ).filter(([, v]) => v >= 50).sort((a, b) => b[1] - a[1]);

  const filtered = selectedChain ? positions.filter((p) => p.chain === selectedChain) : positions;
  const above1k = filtered.filter((p) => (p.value ?? 0) >= 1000);
  const visible = showAll ? filtered : above1k.slice(0, PAGE_SIZE);
  const hasMore = !showAll && (above1k.length > PAGE_SIZE || filtered.length > above1k.length);

  function selectChain(chain: string) {
    setSelectedChain((prev) => prev === chain ? null : chain);
    setShowAll(false);
  }

  return (
    <div className="space-y-2">
      {chains.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chains.map(([chain, value]) => (
            <button
              key={chain}
              onClick={() => selectChain(chain)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors
                ${selectedChain === chain
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground hover:bg-muted"
                }`}
            >
              <span className="capitalize">{chain}</span>
              <span className={selectedChain === chain ? "text-primary-foreground/80" : "font-medium text-foreground"}>
                {fmtUsd(value, 0)}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-muted/40 [&_th]:font-semibold">
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Chain</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">24h change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((p, i) => (
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
                  <div>{fmtPercent(p.change1d)}</div>
                  <div className="text-xs opacity-75">{fmtUsd(p.change1d_usd)}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {(hasMore || showAll) && (
        <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show less" : `Show all ${filtered.length} assets`}
        </Button>
      )}
    </div>
  );
}
