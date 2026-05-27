import { getDb } from "@/lib/db";

export interface ProjectCostPoint {
  project_id: string;
  project_name: string;
  volume_usd: number;
  fees_usd: number;
  gas_usd: number;
  pnl_usd: number;
  recorded_at: number;
}

export function recordProjectSnapshots(): void {
  const db = getDb();
  const projects = db
    .prepare(`SELECT id FROM project WHERE type = 'PERP'`)
    .all() as { id: string }[];

  const stmt = db.prepare(
    `INSERT INTO project_cost_history (project_id, volume_usd, fees_usd, gas_usd, pnl_usd, recorded_at) VALUES (?, ?, ?, ?, ?, ?)`
  );

  const now = Date.now();

  for (const project of projects) {
    const agg = db
      .prepare(
        `SELECT COALESCE(SUM(volume_usd),0) as volume_usd, COALESCE(SUM(fees_usd),0) as fees_usd, COALESCE(SUM(gas_usd),0) as gas_usd, COALESCE(SUM(pnl_usd),0) as pnl_usd FROM wallet_project WHERE project_id = ?`
      )
      .get(project.id) as { volume_usd: number; fees_usd: number; gas_usd: number; pnl_usd: number };

    if (agg.volume_usd > 0) {
      stmt.run(project.id, agg.volume_usd, agg.fees_usd, agg.gas_usd, agg.pnl_usd, now);
    }
  }
}

export function listProjectCostHistory(): ProjectCostPoint[] {
  return getDb()
    .prepare(
      `SELECT h.project_id, p.name as project_name, h.volume_usd, h.fees_usd, h.gas_usd, h.pnl_usd, h.recorded_at FROM project_cost_history h JOIN project p ON p.id = h.project_id ORDER BY h.recorded_at ASC`
    )
    .all() as ProjectCostPoint[];
}
