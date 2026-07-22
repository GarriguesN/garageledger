import { NextRequest, NextResponse } from "next/server";

export const config = {
  // Protect:
  //   - all /api/* routes EXCEPT /api/pin (pre-session login) and /api/session
  //     (introspection: must work pre-session so PinGate can decide what to show)
  //   - all app pages that touch sensitive data: /coches/**, /settings.
  //
  // The home ("/") is INTENTIONALLY NOT in this matcher. GaragePage is a
  // Server Component, and it implements the same defense-in-depth as
  // src/app/coches/[id]/page.tsx: readSessionCookie(cookies()) + redirect to
  // "/" if no session AND a PIN is configured. The home MUST stay reachable
  // when no PIN has been configured yet ("primer uso") — otherwise the
  // user can't reach PinGate to set their PIN at all. For that one case,
  // the middleware can't help (Edge runtime, can't read SQLite) and the SC
  // is the only gate, which is fine — it's the same pattern we already use
  // for /coches/[id] (matcher covers it AND SC double-checks).
  //
  // Ticket 1.3-fix history: an earlier iteration of this fix had "/" in the
  // matcher, but that caused an infinite redirect-loop for first-time users
  // (middleware blocks → SC never runs → PinGate never mounts). The current
  // shape (matcher covers everything sensitive, SC handles "/" alone) is the
  // correct one: tested with curl +13 assertions in
  // scripts/test-middleware-coverage.ts.
  matcher: [
    "/api/((?!pin|session).*)",
    "/coches/:path*",
    "/settings",
  ],
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
  if (!raw) return unauthorized(req);

  const dot = raw.indexOf(".");
  if (dot < 0) return unauthorized(req);
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);

  const key = await importHmacKey(getSecret());
  const expectedBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expectedSig = btoa(String.fromCharCode(...new Uint8Array(expectedBuf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  if (!ctEq(sig, expectedSig)) return unauthorized(req);

  // Decode + expiry check
  let payload: any;
  try {
    payload = JSON.parse(b64urlDecodeToString(body));
  } catch {
    return unauthorized(req);
  }
  if (!payload?.exp || typeof payload.exp !== "number") return unauthorized(req);
  if (Date.now() > payload.exp) return unauthorized(req);

  return NextResponse.next();
}

function unauthorized(req: NextRequest) {
  // Two flavors depending on what got matched:
  //   - /api/* (matched by /api/((?!pin|session).*)) → JSON 401. Clients
  //     (fetch in the browser, curl, scripts) expect a structured error.
  //   - app pages (/coches/*, /settings) → redirect to "/". The home
  //     handles "is the user authenticated or do they need to see the PIN
  //     gate?" via its own SC check; PinGate then either mounts the unlock
  //     form or, if no PIN is configured yet, the "Establecer PIN" wizard.
  const isApi = req.nextUrl.pathname.startsWith("/api");
  if (isApi) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/";
  return NextResponse.redirect(url);
}
