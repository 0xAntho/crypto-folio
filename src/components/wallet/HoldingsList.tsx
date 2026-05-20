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

export default function HoldingsList({ positions }: { positions: Position[] }) {
  const [showAll, setShowAll] = useState(false);
  const above1k = positions.filter((p) => (p.value ?? 0) >= 1000);
  const visible = showAll ? positions : above1k.slice(0, PAGE_SIZE);
  const hasMore = !showAll && (above1k.length > PAGE_SIZE || positions.length > above1k.length);

  return (
    <div className="space-y-2">
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
          {showAll ? "Show less" : `Show all ${positions.length} assets`}
        </Button>
      )}
    </div>
  );
}
