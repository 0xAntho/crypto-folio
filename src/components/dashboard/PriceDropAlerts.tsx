import { TriangleAlert } from "lucide-react";
import { fmtUsd } from "@/lib/format";

export interface PriceDrop {
  symbol: string;
  walletLabel: string;
  baselinePrice: number;
  currentPrice: number;
  dropPct: number;
}

export default function PriceDropAlerts({ drops }: { drops: PriceDrop[] }) {
  if (drops.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 space-y-2">
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
        <TriangleAlert className="h-4 w-4" />
        <p className="text-sm font-medium">Price drop alerts</p>
      </div>
      <ul className="text-sm space-y-1">
        {drops.map((d) => (
          <li key={`${d.walletLabel}-${d.symbol}`} className="text-muted-foreground">
            <span className="font-medium text-foreground">{d.symbol}</span> ({d.walletLabel}) down{" "}
            <span className="font-medium text-red-500">{d.dropPct.toFixed(0)}%</span> since first tracked at{" "}
            {fmtUsd(d.baselinePrice)} → {fmtUsd(d.currentPrice)}
          </li>
        ))}
      </ul>
    </div>
  );
}
