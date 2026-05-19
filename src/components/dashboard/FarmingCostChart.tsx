"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { fmtUsd } from "@/lib/format";

export interface ProjectCostSlice {
  name: string;
  fees: number;
  gas: number;
  pnl: number;
}

interface Props {
  data: ProjectCostSlice[];
}

const DASH = "3 3";


export default function FarmingCostChart({ data }: Props) {
  if (data.length === 0) return null;

  const sorted = [...data].sort((a, b) => {
    const totalA = a.fees + a.gas;
    const totalB = b.fees + b.gas;
    return totalB - totalA;
  });

  function formatY(v: unknown) {
    return fmtUsd(v as number, 0);
  }

  function formatTooltip(value: unknown, name: unknown) {
    const label = name === "fees" ? "Fees" : name === "gas" ? "Gas" : String(name);
    return [fmtUsd(value as number, 0), label];
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={sorted}>
          <CartesianGrid strokeDasharray={DASH} stroke="currentColor" strokeOpacity={0.1} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={formatY} tick={{ fontSize: 12 }} width={70} />
          <Tooltip formatter={formatTooltip} />
          <Legend />
          <Bar dataKey="fees" name="Fees" stackId="a" fill="#f43f5e" />
          <Bar dataKey="gas" name="Gas" stackId="a" fill="#f97316" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
