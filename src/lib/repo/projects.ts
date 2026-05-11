import { getDb } from "@/lib/db";

export type ProjectType = "PERP" | "LP" | "OTHER";

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  url: string | null;
  logo_url: string | null;
  notes: string | null;
}

export function listProjects(): Project[] {
  return getDb()
    .prepare(`SELECT * FROM project ORDER BY name ASC`)
    .all() as Project[];
}

export function getProject(id: string): Project | undefined {
  return getDb()
    .prepare(`SELECT * FROM project WHERE id = ?`)
    .get(id) as Project | undefined;
}

export function createProject(p: Omit<Project, "url" | "logo_url" | "notes"> & Partial<Pick<Project, "url" | "logo_url" | "notes">>): Project {
  const db = getDb();
  const row: Project = {
    id: p.id,
    name: p.name,
    type: p.type,
    url: p.url ?? null,
    logo_url: p.logo_url ?? null,
    notes: p.notes ?? null,
  };
  db.prepare(
    `INSERT INTO project (id, name, type, url, logo_url, notes) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(row.id, row.name, row.type, row.url, row.logo_url, row.notes);
  return row;
}

export function updateProject(id: string, patch: Partial<Omit<Project, "id">>): void {
  const db = getDb();
  const fields = Object.keys(patch)
    .map((k) => `${k} = ?`)
    .join(", ");
  const values = Object.values(patch);
  db.prepare(`UPDATE project SET ${fields} WHERE id = ?`).run(...values, id);
}

export function deleteProject(id: string): void {
  getDb().prepare(`DELETE FROM project WHERE id = ?`).run(id);
}
