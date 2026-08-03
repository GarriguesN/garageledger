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
  // audit:C-1 — En producción, FAIL HARD si no hay secreto válido.
  // Un secreto hardcoded conocido permitiría forjar cookies de sesión.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET no configurada o demasiado corta (mínimo 32 chars). " +
      "Genera una con: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
    );
  }
  // Dev fallback so the app boots even without an env var. In prod (.env),
  // SESSION_SECRET must be set (>=32 chars) — generate with:
  //   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  return "garageledger-dev-secret-do-not-use-in-prod-min-32chars";
}

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
//
// audit:S-2 — Este limitador es la única barrera real contra la fuerza bruta
// del PIN: cuatro dígitos son 10.000 combinaciones. De ahí tres decisiones.
//
// 1) Buckets por ACCIÓN, no globales por IP. Antes `verify`, `set` y `unset`
//    compartían cubo, así que bastaba con spamear `set` para dejar sin
//    intentos de `verify` al usuario legítimo que saliera por la misma IP
//    (cualquier NAT doméstico). Ahora cada acción cuenta por su cuenta.
//
// 2) Backoff exponencial. Con una ventana fija de 5/min un atacante recorre
//    el espacio de PINs de 4 dígitos en unas 33 horas sin despeinarse.
//    Duplicando el castigo en cada ventana agotada (1, 2, 4, 8… minutos, con
//    techo de 15) esa cifra se vuelve absurda, y un usuario que se equivoca
//    dos veces ni se entera.
//
// 3) Ver `clientIp`: de nada sirve contar por IP si el cliente elige la suya.

interface RateBucket {
  count: number;
  resetAt: number;
  /** Ventanas agotadas seguidas. Alimenta el backoff exponencial. */
  strikes: number;
}
const buckets = new Map<string, RateBucket>();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 5;
/** Techo del castigo: más allá de esto solo se molesta al usuario legítimo. */
const RATE_MAX_BACKOFF_MS = 15 * 60 * 1000;
/** Cuánto se recuerda que una IP estuvo castigada. Sin memoria, el atacante
 *  espera a que expire la ventana y vuelve a empezar desde cero. */
const RATE_STRIKE_MEMORY_MS = 60 * 60 * 1000;

/** Ámbitos independientes del limitador. Uno por acción sensible. */
export type RateScope = "verify" | "set" | "unset";

export function checkRate(
  ip: string,
  scope: RateScope = "verify",
  /** Inyectable para que los tests puedan simular el paso del tiempo sin
   *  esperar minutos reales. En producción nadie lo pasa. */
  now: number = Date.now(),
): { ok: true } | { ok: false; retryAfterSec: number } {
  const key = `${scope}:${ip}`;
  const b = buckets.get(key);

  if (!b || b.resetAt <= now) {
    // Los strikes sobreviven a la ventana: si la IP estuvo castigada hace
    // poco, la siguiente vez el castigo empieza donde lo dejó.
    const strikes = b && now - b.resetAt < RATE_STRIKE_MEMORY_MS ? b.strikes : 0;
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS, strikes });
    return { ok: true };
  }

  b.count++;
  if (b.count > RATE_MAX) {
    // El castigo se decide una sola vez por ventana agotada. Si se contara en
    // cada petición bloqueada, un atacante insistente se auto-castigaría con
    // horas en tres segundos y el techo perdería sentido.
    if (b.count === RATE_MAX + 1) {
      b.strikes++;
      const penalty = Math.min(
        RATE_WINDOW_MS * 2 ** (b.strikes - 1),
        RATE_MAX_BACKOFF_MS,
      );
      b.resetAt = now + penalty;
    }
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  return { ok: true };
}

/** IP del cliente para el limitador.
 *
 *  `x-real-ip` lo pone nginx (CT 105) y ahí es fiable. Si la app se expone
 *  directa, en cambio, la cabecera la escribe quien quiera: rotándola se
 *  estrena bucket en cada intento y el limitador deja de existir. Por eso
 *  solo se lee cuando `TRUST_PROXY_HEADERS` lo autoriza explícitamente.
 *
 *  Sin proxy declarado todos comparten cubo. Es peor para la comodidad —dos
 *  personas en la misma app se pisan— y mucho mejor que un límite que se
 *  salta con una cabecera. Un despliegue detrás de nginx solo tiene que
 *  poner TRUST_PROXY_HEADERS=1 en su .env. */
export function clientIp(headers: Headers): string {
  const trusted = /^(1|true|yes)$/i.test(process.env.TRUST_PROXY_HEADERS || "");
  if (!trusted) return "untrusted-direct";
  // Deliberadamente NO se lee X-Forwarded-For: es una lista que el cliente
  // puede prefijar. nginx sobrescribe x-real-ip, que es el único dato bueno.
  const real = headers.get("x-real-ip");
  return real?.trim() || "untrusted-direct";
}

// Periodic cleanup so the Map doesn't grow forever in long-lived processes.
// Se conservan los buckets castigados hasta que caduca su memoria de strikes;
// borrarlos antes sería regalar el backoff acumulado.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (now - v.resetAt > RATE_STRIKE_MEMORY_MS) buckets.delete(k);
  }
}, 5 * 60 * 1000).unref();

/** Solo para tests: vacía los buckets entre casos. */
export function __resetRateLimit(): void {
  buckets.clear();
}

export { COOKIE_NAME };
