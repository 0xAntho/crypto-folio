import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recordProjectSnapshots } from "@/lib/repo/projectCostHistory";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  recordProjectSnapshots();
  return NextResponse.json({ ok: true });
}
