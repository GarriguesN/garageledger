import { NextRequest, NextResponse } from "next/server";

export const config = {
  // Protect everything under /api except /api/pin and /api/session.
  // /api/pin   → pre-session (login)
  // /api/session → introspection (used by PinGate to know if the cookie is valid)
  matcher: ["/api/((?!pin|session).*)"],
};

const COOKIE_NAME = "gl_sess";
const COOKIE_MAX_AGE_SEC = 12 * 60 * 60; // 12h, matches auth.ts SESSION_TTL_MS

// Same dev fallback as src/lib/auth.ts (must keep in sync).
function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  return "garageledger-dev-secret-do-not-use-in-prod-min-32chars";
}

function b64urlDecode(s: string): Uint8Array {
  // atob is base64, not base64url. Translate: -_→+/ and strip padding.
  let t = s.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  const bin = atob(t);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlDecodeToString(s: string): string {
  return new TextDecoder().decode(b64urlDecode(s));
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    "raw",
    enc,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

// Constant-time string comparison
function ctEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readCookie(req: NextRequest, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const raw = readCookie(req, COOKIE_NAME);
  if (!raw) return unauthorized();

  const dot = raw.indexOf(".");
  if (dot < 0) return unauthorized();
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);

  const key = await importHmacKey(getSecret());
  const expectedBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expectedSig = btoa(String.fromCharCode(...new Uint8Array(expectedBuf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  if (!ctEq(sig, expectedSig)) return unauthorized();

  // Decode + expiry check
  let payload: any;
  try {
    payload = JSON.parse(b64urlDecodeToString(body));
  } catch {
    return unauthorized();
  }
  if (!payload?.exp || typeof payload.exp !== "number") return unauthorized();
  if (Date.now() > payload.exp) return unauthorized();

  return NextResponse.next();
}

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
