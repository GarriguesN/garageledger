// audit:S-2 — El limitador del PIN: buckets por acción, backoff exponencial
// y una IP que el cliente no elige.
//
// `checkRate` acepta un `now` inyectable, así que el paso del tiempo se
// simula en vez de esperarlo.

import "./lib/test-db";  // primera línea: fija DB_PATH antes de cargar src/lib/db

import { checkRate, clientIp, __resetRateLimit } from "../src/lib/auth";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean, hint = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label} ${hint}`); }
}

const MINUTE = 60_000;
const t0 = 1_700_000_000_000;  // instante fijo: el test no depende del reloj

console.log("\n=== Rate limit del PIN ===");

// ── 1) La ventana básica: 5 intentos, el sexto se corta.
{
  __resetRateLimit();
  const results = [];
  for (let i = 0; i < 6; i++) results.push(checkRate("1.2.3.4", "verify", t0));
  expect("los 5 primeros intentos pasan", results.slice(0, 5).every((r) => r.ok));
  expect("el sexto se bloquea", !results[5].ok);
  const blocked = results[5];
  expect("el bloqueo dice cuándo reintentar",
    !blocked.ok && blocked.retryAfterSec > 0);
}

// ── 2) Cada acción cuenta por su cuenta.
//    Este era el fallo: spameando `set` se dejaba sin intentos a `verify`.
{
  __resetRateLimit();
  for (let i = 0; i < 10; i++) checkRate("5.6.7.8", "set", t0);
  expect("'set' agotado no bloquea 'verify'", checkRate("5.6.7.8", "verify", t0).ok);
  expect("'set' agotado no bloquea 'unset'", checkRate("5.6.7.8", "unset", t0).ok);
  expect("'set' sigue bloqueado para sí mismo", !checkRate("5.6.7.8", "set", t0).ok);
}

// ── 3) Dos IPs no se pisan (cuando la IP es de fiar).
{
  __resetRateLimit();
  for (let i = 0; i < 6; i++) checkRate("10.0.0.1", "verify", t0);
  expect("otra IP arranca con su cuota entera", checkRate("10.0.0.2", "verify", t0).ok);
}

// ── 4) Backoff exponencial: cada ventana agotada dobla el castigo.
{
  __resetRateLimit();
  const penalties: number[] = [];
  let clock = t0;

  for (let round = 0; round < 4; round++) {
    let blocked: { ok: false; retryAfterSec: number } | null = null;
    for (let i = 0; i < 6; i++) {
      const r = checkRate("9.9.9.9", "verify", clock);
      if (!r.ok && !blocked) blocked = r;
    }
    penalties.push(blocked!.retryAfterSec);
    // Se espera a que expire el castigo y se vuelve a intentar.
    clock += blocked!.retryAfterSec * 1000 + 1000;
  }

  expect("el primer castigo es de un minuto", penalties[0] === 60, `(${penalties[0]}s)`);
  expect("el castigo crece en cada ronda",
    penalties.every((p, i) => i === 0 || p > penalties[i - 1]), `(${penalties.join(", ")}s)`);
  expect("el castigo dobla: 60 → 120 → 240 → 480",
    penalties.join(",") === "60,120,240,480", `(${penalties.join(",")})`);
}

// ── 5) El castigo tiene techo: no se castiga a nadie durante horas.
{
  __resetRateLimit();
  let clock = t0;
  let last = 0;
  for (let round = 0; round < 12; round++) {
    let blocked: { ok: false; retryAfterSec: number } | null = null;
    for (let i = 0; i < 6; i++) {
      const r = checkRate("8.8.8.8", "verify", clock);
      if (!r.ok && !blocked) blocked = r;
    }
    last = blocked!.retryAfterSec;
    clock += blocked!.retryAfterSec * 1000 + 1000;
  }
  expect("el castigo se topa en 15 minutos", last === 15 * 60, `(${last}s)`);
}

// ── 6) Los strikes se olvidan tras una hora de buen comportamiento.
{
  __resetRateLimit();
  for (let i = 0; i < 6; i++) checkRate("7.7.7.7", "verify", t0);
  // Dos horas después: la memoria de strikes ha caducado y se empieza de cero.
  const later = t0 + 2 * 60 * MINUTE;
  for (let i = 0; i < 5; i++) checkRate("7.7.7.7", "verify", later);
  const sixth = checkRate("7.7.7.7", "verify", later);
  expect("tras 2h el castigo vuelve a ser de un minuto",
    !sixth.ok && sixth.retryAfterSec === 60, `(${!sixth.ok ? sixth.retryAfterSec : "no bloqueó"})`);
}

// ── 7) La IP no la elige el cliente salvo que haya proxy declarado.
{
  const spoofed = new Headers({ "x-real-ip": "1.1.1.1" });

  delete process.env.TRUST_PROXY_HEADERS;
  expect("sin proxy declarado se ignora x-real-ip",
    clientIp(spoofed) === "untrusted-direct", `(${clientIp(spoofed)})`);
  expect("sin proxy, dos cabeceras distintas caen en el mismo bucket",
    clientIp(new Headers({ "x-real-ip": "2.2.2.2" })) === clientIp(spoofed));

  process.env.TRUST_PROXY_HEADERS = "1";
  expect("con proxy declarado sí se usa x-real-ip", clientIp(spoofed) === "1.1.1.1");
  expect("con proxy, sin cabecera se cae al bucket compartido",
    clientIp(new Headers()) === "untrusted-direct");

  // X-Forwarded-For nunca cuenta: es una lista que el cliente puede prefijar.
  expect("X-Forwarded-For se ignora siempre",
    clientIp(new Headers({ "x-forwarded-for": "3.3.3.3" })) === "untrusted-direct");
  delete process.env.TRUST_PROXY_HEADERS;
}

console.log(`\nRate limit del PIN: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
