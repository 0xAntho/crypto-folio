"use client";

import { fmtUsd } from "@/lib/format";

interface DataPoint {
  total_usd: number;
  recorded_at: number;
}

interface Props {
  data: DataPoint[];
}

const W = 800;
const H = 200;
const PAD_LEFT = 80;
const PAD_RIGHT = 10;
const PAD_TOP = 10;
const PAD_BOTTOM = 30;
const INNER_W = W - PAD_LEFT - PAD_RIGHT;
const INNER_H = H - PAD_TOP - PAD_BOTTOM;
const GRID_DASH = "4 4";
const VIEW_BOX = "0 0 " + W + " " + H;

export default function PortfolioChart(props: Props) {
  const { data } = props;
  if (data.length < 2) return null;

  const points = [...data].reverse();
  const values = points.map((p) => p.total_usd);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  function toX(i: number) {
    return PAD_LEFT + (i / (points.length - 1)) * INNER_W;
  }
  function toY(v: number) {
    return PAD_TOP + INNER_H - ((v - minVal) / range) * INNER_H;
  }

  const pathD = points
    .map((p, i) => (i === 0 ? "M" : "L") + " " + toX(i) + " " + toY(p.total_usd))
    .join(" ");

  const yTicks = [0, 0.5, 1];
  const labelStep = Math.max(1, Math.ceil(points.length / 6));
  const xLabelIndices = points
    .map((_, i) => i)
    .filter((i) => i % labelStep === 0 || i === points.length - 1);

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-2">Portfolio value</p>
      <svg viewBox={VIEW_BOX} className="w-full" style={{ height: 200 }}>
        {yTicks.map((t) => {
          const v = minVal + t * range;
          const y = toY(v);
          return (
            <g key={t}>
              <line
                x1={PAD_LEFT}
                y1={y}
                x2={W - PAD_RIGHT}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray={GRID_DASH}
              />
              <text x={PAD_LEFT - 6} y={y + 4} textAnchor="end" fontSize={11} fill="currentColor" fillOpacity={0.5}>
                {fmtUsd(v, 0)}
              </text>
            </g>
          );
        })}
        <path d={pathD} fill="none" stroke="#6366f1" strokeWidth={2} />
        {xLabelIndices.map((i) => (
          <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize={11} fill="currentColor" fillOpacity={0.5}>
            {new Date(points[i].recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
        ))}
      </svg>
    </div>
  );
}
