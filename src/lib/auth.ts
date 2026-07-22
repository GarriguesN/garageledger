import { scryptSync, randomBytes, timingSafeEqual, createHmac, createHash } from "node:crypto";

const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

// -------- PIN hash (scrypt) --------

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  // Format: scrypt$N$r$p$saltHex$hashHex  -> easy to detect + future-proof
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  if (!stored) return false;
  // Legacy: existing plaintext PIN (<4 ints, no "$" markers)
  if (!stored.startsWith("scrypt$")) {
    return stored === pin;
  }
  const parts = stored.split("$");
  if (parts.length !== 6) return false;
  const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
  const N = Number(nStr), r = Number(rStr), p = Number(pStr);
  if (!N || !r || !p || !saltHex || !hashHex) return false;
  let salt: Buffer, expected: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  const actual = scryptSync(pin, salt, expected.length, { N, r, p });
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function isPinHashed(stored: string | undefined): boolean {
  return !!stored && stored.startsWith("scrypt$");
}

// -------- Session cookie (HMAC-SHA256) --------

const COOKIE_NAME = "gl_sess";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  // Dev fallback so the app boots even without an env var. In prod (.env),
  // SESSION_SECRET must be set (>=32 chars) — generate with:
  //   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  return "garageledger-dev-secret-do-not-use-in-prod-min-32chars";
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

export interface SessionPayload {
  uid: string;       // user id (we only have one, so a fixed string)
  iat: number;       // issued-at (ms)
  exp: number;       // expiry (ms)
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}
function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function issueSessionCookie(): string {
  const payload: SessionPayload = {
    uid: "owner",
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = sign(body);
  const value = `${body}.${sig}`;
  const attrs = [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  // Secure flag in production (real https); allow http for dev/local testing
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  return attrs.join("; ");
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// Parse and verify a session cookie value (the part after `gl_sess=`,
// i.e. "body.signature"). Returns the payload on success, null on failure
// (missing, malformed, bad signature, or expired). Does NOT look for the
// `gl_sess=` prefix — use `readSessionCookie` for that.
//
// This is the canonical implementation; `readSessionCookie` (below) is a
// thin wrapper that splits a full Cookie header first and then delegates
// here. New callers (e.g. Server Components using `cookies().get(...)`
// from `next/headers`) should use this function directly.
export function readSessionFromValue(value: string | null | undefined): SessionPayload | null {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot < 0) return null;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!body || !sig) return null;

  const expected = sign(body);
  // Constant-time signature compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8"));
  } catch {
    return null;
  }
  if (!payload?.uid || !payload.exp) return null;
  if (Date.now() > payload.exp) return null;
  return payload;
}

export function readSessionCookie(cookieHeader: string | null | undefined): SessionPayload | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const match = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const value = match.slice(COOKIE_NAME.length + 1);
  return readSessionFromValue(value);
}

// -------- IP rate limit (in-memory, per Node process) --------

interface RateBucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, RateBucket>();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 5;

export function checkRate(ip: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true };
  }
  b.count++;
  if (b.count > RATE_MAX) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { ok: true };
}

// Periodic cleanup so the Map doesn't grow forever in long-lived processes.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}, 5 * 60 * 1000).unref();

export { COOKIE_NAME };
