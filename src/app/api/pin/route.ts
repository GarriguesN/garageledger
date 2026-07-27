import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import { hashPin, verifyPin, isPinHashed, issueSessionCookie, clearSessionCookie, checkRate } from "@/lib/auth";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  // audit:A-4 — No confiar en X-Forwarded-For: el cliente puede spoofarlo
  // para obtener un bucket de rate limit fresco. Solo x-real-ip, que nginx
  // (CT 105) establece de forma fiable.
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "local";
}

// Used only to derive a stable PIN length for legacy plaintext rows where the
// PIN is no longer recoverable. Once migrated (or unset), we return 0 and the
// UI forces a set-PIN wizard. We deliberately do NOT persist the plaintext.
function inferLegacyPinLength(stored: string | undefined): number {
  if (!stored) return 0;
  if (isPinHashed(stored)) return 0;        // hashed → caemos al setting pin_length
  if (!/^\d+$/.test(stored)) return 0;
  if (stored.length < 4 || stored.length > 10) return 0;
  return stored.length;
}

export async function GET() {
  const pin = getSetting("pin");
  let len = inferLegacyPinLength(pin);
  if (len === 0 && pin) {
    // PIN hasheado: leemos la longitud guardada explícitamente al set.
    const stored = parseInt(getSetting("pin_length") || "0", 10);
    if (stored >= 4 && stored <= 10) len = stored;
  }
  return NextResponse.json({ configured: !!pin, pinLength: len });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = checkRate(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Inténtalo más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  const { action, pin } = body ?? {};

  if (action === "verify") {
    if (typeof pin !== "string" || pin.length < 4 || pin.length > 10 || !/^\d+$/.test(pin)) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }
    const stored = getSetting("pin") || "";
    const valid = verifyPin(pin, stored);

    const res = NextResponse.json({ valid });
    if (valid) {
      // Issue the session cookie alongside the JSON response.
      res.headers.append("Set-Cookie", issueSessionCookie());
    }
    return res;
  }

  if (action === "set") {
    if (typeof pin !== "string" || pin.length < 4 || pin.length > 10 || !/^\d+$/.test(pin)) {
      return NextResponse.json({ error: "El PIN debe tener entre 4 y 10 dígitos" }, { status: 400 });
    }
    setSetting("pin", hashPin(pin));
    // Persistimos la longitud para que el GET pueda saber cuántos dígitos
    // esperar antes de auto-verificar (Ticket 1.16-mejora).
    setSetting("pin_length", String(pin.length));
    const res = NextResponse.json({ success: true });
    // Setting a PIN grants an immediate session for the owner.
    res.headers.append("Set-Cookie", issueSessionCookie());
    return res;
  }

  // audit:C-2 — Acción explícita para eliminar el PIN. Antes se usaba
  // action='set' con pin='' pero la validación de length >= 4 lo rechazaba.
  if (action === "unset") {
    setSetting("pin", "");
    setSetting("pin_length", "");
    const res = NextResponse.json({ success: true });
    res.headers.append("Set-Cookie", clearSessionCookie());
    return res;
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
