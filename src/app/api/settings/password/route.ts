import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { oldPassword, newPassword } = await req.json();
  const db = getDb();
  const user = db
    .prepare(`SELECT * FROM user WHERE username = ?`)
    .get(session.user?.name) as { id: string; password_hash: string } | undefined;

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const valid = await bcrypt.compare(oldPassword, user.password_hash);
  if (!valid) return NextResponse.json({ error: "Current password incorrect" }, { status: 400 });

  const hash = await bcrypt.hash(newPassword, 12);
  db.prepare(`UPDATE user SET password_hash = ? WHERE id = ?`).run(hash, user.id);

  return NextResponse.json({ ok: true });
}
