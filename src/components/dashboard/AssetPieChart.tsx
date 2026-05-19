"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fmtUsd } from "@/lib/format";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#94a3b8"];

export interface AssetSlice {
  symbol: string;
  value: number;
  pct: number;
}

interface Props {
  slices: AssetSlice[];
}

export default function AssetPieChart({ slices }: Props) {
  if (slices.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-medium">Asset allocation</h2>
      <div className="rounded-xl border bg-card p-4">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="symbol" cx="50%" cy="50%" outerRadius={100} innerRadius={60}>
              {slices.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [fmtUsd(typeof value === "number" ? value : null), name]}
              contentStyle={{ fontSize: 13 }}
            />
            <Legend formatter={(value, entry) => `${value} ${(entry.payload as AssetSlice).pct.toFixed(1)}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
