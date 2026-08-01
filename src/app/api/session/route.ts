import { NextRequest, NextResponse } from "next/server";
import { readSessionCookie, clearSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: returns whether the caller holds a valid session cookie.
export async function GET(req: NextRequest) {
  const payload = readSessionCookie(req.headers.get("cookie"));
  return NextResponse.json({ unlocked: !!payload });
}

// DELETE: clears the cookie (logout). Idempotent.
export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", clearSessionCookie());
  return res;
}
