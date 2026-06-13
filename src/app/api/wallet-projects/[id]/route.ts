import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteWalletProject, setWalletProjectStatus } from "@/lib/repo/walletProjects";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  deleteWalletProject(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  if (body.status !== "active" && body.status !== "closed") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  setWalletProjectStatus(id, body.status);
  return NextResponse.json({ ok: true });
}
