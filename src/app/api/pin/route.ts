import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import {
  hashPin, verifyPin, isPinHashed,
  issueSessionCookie, clearSessionCookie, readSessionCookie,
  checkRate, clientIp, type RateScope,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

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

// audit:S-1 — `/api/pin` está fuera del matcher del middleware (tiene que
// funcionar sin sesión: es la puerta por la que se entra). Eso deja a este
// handler como único responsable de decidir quién puede tocar el PIN.
//
// Regla: cambiar o quitar un PIN que YA existe es una operación de dueño, y
// exige demostrarlo — con la cookie de sesión o escribiendo el PIN actual.
// Sin esta comprobación, un `POST {"action":"set"}` desde cualquier punto de
// la red sobrescribía el PIN y devolvía una sesión válida en la misma
// respuesta (CWE-306).
//
// El primer uso es la excepción deliberada: cuando no hay PIN configurado no
// hay nada que demostrar, y si se exigiera sesión nadie podría establecer el
// primero. Es la misma asimetría que el middleware documenta para "/".
type OwnerCheck = { ok: true } | { ok: false; status: 401 | 403; error: string };

function requireOwner(req: NextRequest, body: { currentPin?: unknown }): OwnerCheck {
  const stored = getSetting("pin") || "";
  // Primer uso: sin PIN configurado no hay secreto que proteger.
  if (!stored) return { ok: true };

  // 1) Sesión válida (el caso normal: el usuario ya ha entrado con su PIN).
  if (readSessionCookie(req.headers.get("cookie"))) return { ok: true };

  // 2) O el PIN actual, para clientes sin cookie (curl, scripts de mantenimiento).
  const current = body?.currentPin;
  if (typeof current === "string" && current.length > 0 && verifyPin(current, stored)) {
    return { ok: true };
  }

  return {
    ok: false,
    status: 403,
    error: "Se requiere el PIN actual o una sesión activa para cambiarlo",
  };
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
  // El cuerpo se lee antes que el rate limit porque el bucket depende de la
  // acción (audit:S-2): contar `set` y `verify` juntos permitía a un atacante
  // agotar con `set` los intentos de desbloqueo del usuario legítimo.
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  const { action, pin } = body ?? {};

  if (action !== "verify" && action !== "set" && action !== "unset") {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  const rl = checkRate(clientIp(req.headers), action as RateScope);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Inténtalo más tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

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
    const owner = requireOwner(req, body);
    if (!owner.ok) return NextResponse.json({ error: owner.error }, { status: owner.status });

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
    const owner = requireOwner(req, body);
    if (!owner.ok) return NextResponse.json({ error: owner.error }, { status: owner.status });

    setSetting("pin", "");
    setSetting("pin_length", "");
    const res = NextResponse.json({ success: true });
    res.headers.append("Set-Cookie", clearSessionCookie());
    return res;
  }

  // Inalcanzable: la acción se valida arriba, antes del rate limit. Se deja
  // por exhaustividad del tipo de retorno.
  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
