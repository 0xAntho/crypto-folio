import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteWalletProject } from "@/lib/repo/walletProjects";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  deleteWalletProject(id);
  return NextResponse.json({ ok: true });
}
