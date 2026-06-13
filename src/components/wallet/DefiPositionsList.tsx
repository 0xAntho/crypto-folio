"use client";

import { Fragment, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtUsd, fmtNumber } from "@/lib/format";

export interface DefiPosition {
  protocol: string;
  symbol: string;
  type: string;
  chain: string;
  qty: number;
  value: number | null;
  price: number | null;
}

interface ProtocolGroup {
  protocol: string;
  totalValue: number;
  positions: DefiPosition[];
}

function defiTypeColor(type: string) {
  if (type === "deposit")    return "border-violet-400/40 bg-violet-400/10 text-violet-500";
  if (type === "staked")     return "border-amber-400/40 bg-amber-400/10 text-amber-500";
  if (type === "loan")       return "border-red-400/40 bg-red-400/10 text-red-500";
  if (type === "locked")     return "border-zinc-400/40 bg-zinc-400/10 text-zinc-500";
  if (type === "reward")     return "border-green-400/40 bg-green-400/10 text-green-500";
  if (type === "investment") return "border-blue-400/40 bg-blue-400/10 text-blue-500";
  return "border-muted-foreground/30 text-muted-foreground";
}

export default function DefiPositionsList({ positions }: { positions: DefiPosition[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function signedValue(p: DefiPosition) {
    return p.type === "loan" ? -(p.value ?? 0) : (p.value ?? 0);
  }

  const groups: ProtocolGroup[] = [];
  for (const p of positions) {
    const existing = groups.find((g) => g.protocol === p.protocol);
    if (existing) {
      existing.positions.push(p);
      existing.totalValue += signedValue(p);
    } else {
      groups.push({ protocol: p.protocol, totalValue: signedValue(p), positions: [p] });
    }
  }
  groups.sort((a, b) => b.totalValue - a.totalValue);

  function toggle(protocol: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(protocol)) next.delete(protocol);
      else next.add(protocol);
      return next;
    });
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="bg-muted/40 [&_th]:font-semibold">
          <TableRow>
            <TableHead>Protocol</TableHead>
            <TableHead>Positions</TableHead>
            <TableHead className="text-right">Total value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((g) => {
            const isOpen = expanded.has(g.protocol);
            return (
              <Fragment key={g.protocol}>
                <TableRow
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggle(g.protocol)}
                >
                  <TableCell className="font-medium flex items-center gap-2">
                    <ChevronRight
                      className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
                    />
                    {g.protocol}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{g.positions.length} position{g.positions.length > 1 ? "s" : ""}</TableCell>
                  <TableCell className={`text-right ${g.totalValue < 0 ? "text-red-500" : ""}`}>{fmtUsd(g.totalValue)}</TableCell>
                </TableRow>
                {isOpen && g.positions.map((p, i) => (
                  <TableRow key={i} className="bg-muted/20">
                    <TableCell className="pl-10 text-sm text-muted-foreground">{p.symbol}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={defiTypeColor(p.type)}>{p.type}</Badge>
                        <span className="text-xs text-muted-foreground">{p.chain}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={`text-sm ${p.type === "loan" ? "text-red-500" : ""}`}>
                        {p.type === "loan" ? "-" : ""}{fmtUsd(p.value)}
                      </div>
                      <div className="text-xs text-muted-foreground">{fmtNumber(p.qty, 4)} @ {fmtUsd(p.price, 4)}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
