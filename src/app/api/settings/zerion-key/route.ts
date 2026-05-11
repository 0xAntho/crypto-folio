import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { key } = await req.json();
  process.env.ZERION_API_KEY = key;
  return NextResponse.json({ ok: true });
}
