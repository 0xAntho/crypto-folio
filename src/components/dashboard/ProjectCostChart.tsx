"use client";

import { useState } from "react";
import { costPerMVolume } from "@/lib/metrics";
import { fmtUsd } from "@/lib/format";
import type { ProjectCostPoint } from "@/lib/repo/projectCostHistory";

interface Props {
  data: ProjectCostPoint[];
}

const W = 800;
const H = 220;
const PAD_LEFT = 80;
const PAD_RIGHT = 10;
const PAD_TOP = 10;
const PAD_BOTTOM = 30;
const INNER_W = W - PAD_LEFT - PAD_RIGHT;
const INNER_H = H - PAD_TOP - PAD_BOTTOM;
const GRID_DASH = "4 4";
const VIEW_BOX = "0 0 " + W + " " + H;
const COLORS = ["#6366f1", "#f43f5e", "#f97316", "#22c55e", "#a855f7", "#06b6d4"];
const Y_TICKS = [0, 0.5, 1];
const DATE_OPTS = { month: "short", day: "numeric" } as Intl.DateTimeFormatOptions;

export default function ProjectCostChart({ data }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  if (data.length === 0) return null;

  // Group by project, preserving insertion order for stable color assignment
  const byProject = new Map<string, { name: string; points: { t: number; v: number }[] }>();
  for (const row of data) {
    const v = costPerMVolume(row.gas_usd, row.fees_usd, row.volume_usd, row.pnl_usd);
    if (v === null) continue;
    if (!byProject.has(row.project_id)) {
      byProject.set(row.project_id, { name: row.project_name, points: [] });
    }
    byProject.get(row.project_id)!.points.push({ t: row.recorded_at, v });
  }

  const allProjects = Array.from(byProject.entries())
    .filter(([, p]) => p.points.length >= 2)
    .map(([id, p], i) => ({ id, name: p.name, points: p.points, color: COLORS[i % COLORS.length] }));

  if (allProjects.length === 0) return null;

  const visibleProjects = allProjects.filter((p) => !hidden.has(p.id));

  const allTs = Array.from(new Set(data.map((d) => d.recorded_at))).sort((a, b) => a - b);
  const minT = allTs[0];
  const maxT = allTs[allTs.length - 1];
  const rangeT = maxT - minT || 1;

  const visibleVals = visibleProjects.flatMap((p) => p.points.map((pt) => pt.v));
  const minV = visibleVals.length > 0 ? Math.min(...visibleVals) : 0;
  const maxV = visibleVals.length > 0 ? Math.max(...visibleVals) : 1;
  const rangeV = maxV - minV || 1;

  function toX(t: number) {
    return PAD_LEFT + ((t - minT) / rangeT) * INNER_W;
  }
  function toY(v: number) {
    return PAD_TOP + INNER_H - ((v - minV) / rangeV) * INNER_H;
  }

  const labelStep = Math.max(1, Math.ceil(allTs.length / 6));
  const xLabelTs = allTs.filter((_, i) => i % labelStep === 0 || i === allTs.length - 1);

  function toggle(id: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <p className="text-xs text-muted-foreground">$/$1M vol over time</p>

      <div className="flex flex-wrap gap-2">
        {allProjects.map((proj) => {
          const active = !hidden.has(proj.id);
          return (
            <button
              key={proj.id}
              onClick={() => toggle(proj.id)}
              className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-opacity"
              style={{ borderColor: proj.color, opacity: active ? 1 : 0.35 }}
            >
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: proj.color }} />
              {proj.name}
            </button>
          );
        })}
      </div>

      <svg viewBox={VIEW_BOX} className="w-full" style={{ height: H }}>
        {Y_TICKS.map((t) => {
          const v = minV + t * rangeV;
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
              <text x={PAD_LEFT - 6} y={y + 4} textAnchor="end" fontSize={13} fill="currentColor" fillOpacity={0.6}>
                {fmtUsd(v, 0)}
              </text>
            </g>
          );
        })}

        {visibleProjects.map((proj) => {
          const d = proj.points
            .map((pt, j) => (j === 0 ? "M" : "L") + " " + toX(pt.t) + " " + toY(pt.v))
            .join(" ");
          return <path key={proj.id} d={d} fill="none" stroke={proj.color} strokeWidth={2} />;
        })}

        {xLabelTs.map((t) => (
          <text key={t} x={toX(t)} y={H - 6} textAnchor="middle" fontSize={13} fill="currentColor" fillOpacity={0.6}>
            {new Date(t).toLocaleDateString("en-US", DATE_OPTS)}
          </text>
        ))}
      </svg>
    </div>
  );
}
