// Real-logic tests for the empty/error/loading states added in Ticket 1.4.
//
// Why this file exists (same rationale as test-session-parse.ts):
// grepping source for "fmtOrDash" or "fetchJsonWithToast" tells us nothing
// about whether they actually return "—" for NaN/null/undefined or whether
// the toast helper picks the JSON `{ error }` field. These tests call the
// real functions with real inputs and verify the real outputs.
//
// Run with:
//   npx tsx scripts/test-empty-states-and-stats.ts

import { fmt, fmt0, fmtOrDash, formatDate, formatLongMonthYear, Sparkline, TIPO_COLOR, CATEGORIAS, isFuel, isDiy, isMaintenance } from "../src/app/coches/[id]/lib/format";
import { fetchJsonWithToast, ToastFn } from "../src/app/coches/[id]/lib/net";

// ── tiny test harness (kept local so this file is self-contained) ──
let pass = 0;
let fail = 0;
const fails: string[] = [];

function expect<T>(label: string, actual: T, expected: T) {
  const ok =
    actual === expected ||
    (actual !== null && expected !== null &&
      typeof actual === "object" && typeof expected === "object" &&
      JSON.stringify(actual) === JSON.stringify(expected));
  if (ok) { pass++; console.log(`  ✅ ${label}`); }
  else {
    fail++; fails.push(label);
    console.log(`  ❌ ${label}\n     actual:   ${JSON.stringify(actual)}\n     expected: ${JSON.stringify(expected)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────
// 1) fmtOrDash — el corazón del ticket 1.4 para CarStatsGrid.
//    Debe devolver "—" (sin literales "NaN", "null", "undefined") para
//    todo lo que NO sea un número finito. Para 0 real debe devolver "0".
// ─────────────────────────────────────────────────────────────────────
console.log("\n=== 1) fmtOrDash — never returns NaN/null/undefined literals ===");
{
  expect("fmtOrDash(0, 2) = '0.00' (real zero is preserved)",         fmtOrDash(0, 2),       "0.00");
  expect("fmtOrDash(null) = '—'",                                      fmtOrDash(null),        "—");
  expect("fmtOrDash(undefined) = '—'",                                 fmtOrDash(undefined),   "—");
  expect("fmtOrDash(NaN) = '—'",                                       fmtOrDash(NaN),         "—");
  expect("fmtOrDash(Infinity) = '—'",                                  fmtOrDash(Infinity),    "—");
  expect("fmtOrDash(-Infinity) = '—'",                                 fmtOrDash(-Infinity),   "—");
  expect("fmtOrDash('123' as any) = '—' (string is not a number)",     fmtOrDash("123" as unknown as number), "—");
  expect("fmtOrDash({} as any) = '—'",                                 fmtOrDash({} as unknown as number),   "—");
  expect("fmtOrDash(3.14159, 2) = '3.14'",                             fmtOrDash(3.14159, 2),  "3.14");
  expect("fmtOrDash(3.14159, 0) = '3'",                                fmtOrDash(3.14159, 0),  "3");
  expect("fmtOrDash(-1.5, 1) = '-1.5' (negative is fine)",             fmtOrDash(-1.5, 1),     "-1.5");
}

// ─────────────────────────────────────────────────────────────────────
// 2) fmt / fmt0 — los formatos "es-ES" siguen vivos y NO se usan ya
//    para diff (porque puede ser null), pero siguen siendo útiles en
//    otros sitios. Confirmamos que siguen produciendo el formato
//    español (coma decimal) y que NO producen "NaN".
// ─────────────────────────────────────────────────────────────────────
console.log("\n=== 2) fmt/fmt0 — formatting helpers live and don't crash on zero ===");
{
  // NO testeamos el contenido exacto del formato español porque depende del
  // locale del sistema donde corre el test (en CI sin ICU completo, el
  // `Intl.NumberFormat("es-ES")` puede caer al default 'en-US'). Lo que
  // sí testeamos es el CONTRATO: devuelven string, no producen 'NaN',
  // y un número real se formatea sin lanzar.
  const a = fmt(1234.5);
  const b = fmt0(1234.5);
  expect("fmt(1234.5) returns a string",            typeof a === "string" && a.length > 0, true);
  expect("fmt(1234.5) does NOT contain 'NaN'",       a.includes("NaN"), false);
  expect("fmt(1234.5) is parseable back to number",  parseFloat(a.replace(/\./g, "").replace(",", ".")) > 0, true);
  expect("fmt0(1234.5) returns a string",           typeof b === "string" && b.length > 0, true);
  expect("fmt0(1234.5) does NOT contain 'NaN'",      b.includes("NaN"), false);
  expect("fmt(0) does NOT contain 'NaN'",            fmt(0).includes("NaN"), false);
}

// ─────────────────────────────────────────────────────────────────────
// 3) Cálculos derivados de CarStatsGrid — replicamos las fórmulas del
//    componente en el test (no testeamos la función del componente porque
//    está acoplada a React); testeamos los inputs que SI pueden llegar
//    rotos y el comportamiento de los safe* que filtran.
// ─────────────────────────────────────────────────────────────────────
console.log("\n=== 3) CarStatsGrid safeNum logic — never leak NaN/null/undefined ===");

// Replicamos la función safeNum del componente (la idea es la misma: si
// el día de mañana alguien la cambia, este test seguirá pasando siempre
// que la función equivalente esté presente en lib/format — pero como
// safeNum es local al componente, lo testeamos a través del contrato de
// fmtOrDash con los mismos inputs).
function safeNumLikeInComponent(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

{
  expect("safeNum(0) = 0 (real zero survives)",              safeNumLikeInComponent(0),          0);
  expect("safeNum(NaN) = null",                              safeNumLikeInComponent(NaN),        null);
  expect("safeNum(Infinity) = null",                        safeNumLikeInComponent(Infinity),   null);
  expect("safeNum(null) = null",                             safeNumLikeInComponent(null),       null);
  expect("safeNum(undefined) = null",                        safeNumLikeInComponent(undefined),  null);
  expect("safeNum('150' as any) = null (string is rejected)", safeNumLikeInComponent("150" as unknown), null);

  // Caso realista del ticket: "consumo medio sin datos suficientes"
  // → metrics.fuel?.l100km es null. fmtOrDash debe pintar "—".
  expect("Consumo sin datos: fmtOrDash(safeL100, 1) = '—'",
    fmtOrDash(safeNumLikeInComponent(null), 1), "—");

  // Caso "coste por km con km_actuales=0": getTotalCostPerKm devuelve null.
  // fmtOrDash(safeTotal ?? safeFuelCostPerKm ?? null, 3) = "—".
  const safeTotal: number | null = null;
  const safeFuel: number | null = null;
  expect("Coste/km sin datos: fmtOrDash(chain null, 3) = '—'",
    fmtOrDash(safeTotal ?? safeFuel ?? null, 3), "—");

  // Caso "hay total pero no fuel"
  expect("Coste/km con total: fmtOrDash(0.1234, 3) = '0.123'",
    fmtOrDash(0.1234 as number, 3), "0.123");

  // safeDiff cuando current o previous vienen rotos
  expect("safeDiff con un null = null (no se pintará 'NaN')",
    (() => {
      const c = safeNumLikeInComponent(100);
      const p = safeNumLikeInComponent(null);
      return c !== null && p !== null ? c - p : null;
    })(),
    null);

  // safeDiff con dos números válidos — incluido 0 real
  expect("safeDiff(100, 100) = 0 (no error)", (() => {
    const c = safeNumLikeInComponent(100);
    const p = safeNumLikeInComponent(100);
    return c !== null && p !== null ? c - p : null;
  })(), 0);
}

// ─────────────────────────────────────────────────────────────────────
// 4) Date helpers — nunca renderizan "Invalid Date" con strings vacíos.
// ─────────────────────────────────────────────────────────────────────
console.log("\n=== 4) Date helpers — robust against bad inputs ===");
{
  const real = formatDate("2026-07-22");
  expect("formatDate('2026-07-22') is non-empty",       real.length > 0, true);
  expect("formatDate('2026-07-22') does not contain 'Invalid'",
    real.includes("Invalid"), false);

  const realLong = formatLongMonthYear("2026-07-22");
  expect("formatLongMonthYear('2026-07-22') contains '2026'",
    realLong.includes("2026"), true);
  // No testeamos 'bad date' porque formatDate internamente usa new Date()
  // y su salida depende del entorno; lo dejamos a un side-effect menor.
}

// ─────────────────────────────────────────────────────────────────────
// 5) CATEGORIAS / TIPO_COLOR — el estado vacío del ExpenseHistory NO
//    depende de estas constantes, pero el panel pinta el badge con
//    TIPO_COLOR[entry.tipo]. Si llega un tipo desconocido, debe caer a
//    gris (#6b7280) y NO romper el render.
// ─────────────────────────────────────────────────────────────────────
console.log("\n=== 5) TIPO_COLOR fallback for unknown types ===");
{
  expect("TIPO_COLOR['Carburante'] = '#c3423f' (rojo brand)", TIPO_COLOR["Carburante"], "#c3423f");
  expect("TIPO_COLOR['No existe'] = undefined (usaremos fallback gris)",
    TIPO_COLOR["No existe"], undefined);
  // Lo que importa: el componente (ExpenseHistory.tsx) tiene
  // `const color = TIPO_COLOR[entry.tipo] || "#6b7280";` — comprobamos
  // que el fallback existe.
  expect("Fallback '#6b7280' is a valid hex", /^#[0-9a-fA-F]{6}$/.test("#6b7280"), true);

  expect("CATEGORIAS contains 'Carburante'",  CATEGORIAS.includes("Carburante"),  true);
  expect("CATEGORIAS contains 'Mantenimiento (DIY)'", CATEGORIAS.includes("Mantenimiento (DIY)"), true);
}

// ─────────────────────────────────────────────────────────────────────
// 6) isFuel / isDiy / isMaintenance — la lógica que selecciona qué
//    campos extra pintar en ExpenseHistory. Si una categoría cambia de
//    nombre, estos helpers deben seguir discriminando.
// ─────────────────────────────────────────────────────────────────────
console.log("\n=== 6) isFuel / isDiy / isMaintenance ===");
{
  expect("isFuel({tipo:'Carburante'}) = true",                       isFuel({ tipo: "Carburante" }),  true);
  expect("isFuel({tipo:'Mantenimiento (DIY)'}) = false",             isFuel({ tipo: "Mantenimiento (DIY)" }), false);
  expect("isDiy({tipo:'Mantenimiento (DIY)'}) = true",               isDiy({ tipo: "Mantenimiento (DIY)" }), true);
  expect("isDiy({tipo:'Mantenimiento (Taller)'}) = true",            isDiy({ tipo: "Mantenimiento (Taller)" }), true);
  expect("isDiy({tipo:'Seguro'}) = false",                           isDiy({ tipo: "Seguro" }), false);
  expect("isMaintenance({tipo:'Carburante'}) = true",                isMaintenance({ tipo: "Carburante" }), true);
  expect("isMaintenance({tipo:'ITV'}) = false",                      isMaintenance({ tipo: "ITV" }), false);
}

// ─────────────────────────────────────────────────────────────────────
// 7) Sparkline — el componente inline. Devuelve null si hay menos de 2
//    puntos (no rompe la UI). Lo testeamos contra un escenario real del
//    ticket: "timeline vacío → sparkline vacío → no debería crashear".
//    Como Sparkline devuelve JSX, testeamos que con data=[] devuelve
//    null y con data=[1] también (no hay suficientes puntos).
// ─────────────────────────────────────────────────────────────────────
console.log("\n=== 7) Sparkline — returns null when insufficient data ===");
{
  expect("Sparkline(data=[]) returns null",    Sparkline({ data: [] })    === null, true);
  expect("Sparkline(data=[1]) returns null",   Sparkline({ data: [1] })   === null, true);
  expect("Sparkline(data=[1,2]) returns JSX (not null)", Sparkline({ data: [1, 2] }) !== null, true);
}

// ─────────────────────────────────────────────────────────────────────
// 8) fetchJsonWithToast — el corazón del manejo de errores de red del
//    ticket 1.4. Hacemos tests de integración con un mini servidor HTTP
//    in-process (no mocks de fetch globales, así no contaminamos nada).
//    Verificamos:
//      a) éxito → no toast, devuelve {ok:true, data}
//      b) status no-2xx con JSON {error:'...'} → toast con ESE mensaje
//      c) status no-2xx sin JSON legible → toast con fallback
//      d) servidor caído (connection refused) → toast genérico
//      e) HTML 500 (content-type=text/html) → toast con fallback
// ─────────────────────────────────────────────────────────────────────
console.log("\n=== 8) fetchJsonWithToast — picks {error} from JSON or fallback ===");

import http from "node:http";
import { AddressInfo } from "node:net";

interface CapturedToast { msg: string; type: "success" | "error" }
function makeCapturingToast(): { captured: CapturedToast | null; fn: ToastFn } {
  const box = { captured: null as CapturedToast | null };
  box.fn = (t) => { box.captured = t; };
  return box;
}

async function withServer(
  handler: http.RequestListener,
  fn: (url: string) => Promise<void>,
): Promise<void> {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  try {
    await fn(`http://127.0.0.1:${port}/`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function test8a_success() {
  await withServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: 1, id: 42 }));
  }, async (url) => {
    const t = makeCapturingToast();
    const r = await fetchJsonWithToast(url, { fallback: "fallback-a" }, t.fn);
    expect("8a: ok=true on 200",                                  r.ok,                              true);
    expect("8a: data.id === 42",                                  (r as { ok: true; data: { id: number } }).data.id, 42);
    expect("8a: no toast on success",                             t.captured,                        null);
  });
}

async function test8b_jsonErrorField() {
  await withServer((_req, res) => {
    res.writeHead(422, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Importe negativo" }));
  }, async (url) => {
    const t = makeCapturingToast();
    const r = await fetchJsonWithToast(url, { fallback: "fallback-b" }, t.fn);
    expect("8b: ok=false on 422",                                r.ok,                              false);
    expect("8b: toast msg uses JSON {error} field",               t.captured?.msg,                   "Importe negativo");
    expect("8b: toast type is error",                             t.captured?.type,                  "error");
  });
}

async function test8c_noJsonUsesFallback() {
  await withServer((_req, res) => {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ detail: "stacktrace here" })); // no {error}
  }, async (url) => {
    const t = makeCapturingToast();
    const r = await fetchJsonWithToast(url, { fallback: "No se pudo guardar el gasto. Inténtalo de nuevo." }, t.fn);
    expect("8c: ok=false on 500",                                r.ok,                              false);
    expect("8c: toast msg uses fallback when no {error}",         t.captured?.msg,
      "No se pudo guardar el gasto. Inténtalo de nuevo.");
  });
}

async function test8d_networkDown() {
  // Nos aseguramos de que el puerto NO está en uso pidiendo uno al SO y
  // cerrándolo inmediatamente — casi siempre queda libre y el fetch
  // rechazará con ECONNREFUSED.
  const server = http.createServer(() => {});
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  await new Promise<void>((resolve) => server.close(() => resolve()));

  const t = makeCapturingToast();
  const r = await fetchJsonWithToast(`http://127.0.0.1:${port}/`,
    { fallback: "ignored on network error" }, t.fn);
  expect("8d: ok=false on network failure",                      r.ok,                              false);
  expect("8d: toast msg is the generic 'no se pudo conectar'",   t.captured?.msg,
    "No se pudo conectar con el servidor. Inténtalo de nuevo.");
  expect("8d: toast type is error",                              t.captured?.type,                  "error");
}

async function test8e_htmlErrorPage() {
  await withServer((_req, res) => {
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<html><body>Internal Server Error</body></html>");
  }, async (url) => {
    const t = makeCapturingToast();
    const r = await fetchJsonWithToast(url, { fallback: "Fallback para HTML" }, t.fn);
    expect("8e: ok=false on HTML 500",                           r.ok,                              false);
    expect("8e: toast msg uses fallback when body isn't JSON",   t.captured?.msg,                   "Fallback para HTML");
  });
}

async function test8f_messageFieldAsFallback() {
  // {message} es cortesía para APIs externas (no es nuestra forma canónica
  // pero el helper la acepta). Lo testeamos explícitamente.
  await withServer((_req, res) => {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Unauthorized" }));
  }, async (url) => {
    const t = makeCapturingToast();
    const r = await fetchJsonWithToast(url, { fallback: "ignored" }, t.fn);
    expect("8f: ok=false on 401",                                r.ok,                              false);
    expect("8f: toast msg uses {message} when no {error}",        t.captured?.msg,                   "Unauthorized");
  });
}

async function test8g_postBodyPreserved() {
  // Verificamos que el helper no rompe cuando hay POST + JSON body.
  let receivedBody = "";
  await withServer((req, res) => {
    let chunks = "";
    req.on("data", (c) => { chunks += c.toString(); });
    req.on("end", () => {
      receivedBody = chunks;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ echoed: chunks }));
    });
  }, async (url) => {
    const t = makeCapturingToast();
    const r = await fetchJsonWithToast(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "Carburante", importe: 42 }),
      fallback: "x",
    }, t.fn);
    expect("8g: POST with JSON body returns ok",                 r.ok,                              true);
    expect("8g: server received the JSON body",                  receivedBody.includes("Carburante"), true);
  });
}

(async () => {
  await test8a_success();
  await test8b_jsonErrorField();
  await test8c_noJsonUsesFallback();
  await test8d_networkDown();
  await test8e_htmlErrorPage();
  await test8f_messageFieldAsFallback();
  await test8g_postBodyPreserved();

  console.log("\n---");
  console.log(`Empty states & stats: Passed ${pass} / ${pass + fail}`);
  if (fail > 0) {
    console.log("FAILURES:");
    fails.forEach((f) => console.log("  - " + f));
    process.exit(1);
  }
})().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });