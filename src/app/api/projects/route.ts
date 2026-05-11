import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listProjects, createProject } from "@/lib/repo/projects";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(listProjects());
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const project = createProject({ id: crypto.randomUUID(), ...body });
  return NextResponse.json(project, { status: 201 });
}
