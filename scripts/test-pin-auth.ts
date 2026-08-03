// audit:S-1 — Nadie puede cambiar ni quitar un PIN ya configurado sin
// demostrar que es el dueño (cookie de sesión o PIN actual).
//
// Ejecuta el handler real de /api/pin contra una BD temporal. Sin servidor y
// sin red: el objetivo es fijar la regla de autorización, no el transporte.

import "./lib/test-db";  // primera línea: fija DB_PATH antes de cargar src/lib/db

// Este test mide la autorización, no el rate limit (que tiene el suyo en
// test-pin-rate-limit.ts). Declarando proxy de confianza, cada caso estrena
// IP y por tanto bucket, y el limitador no se cruza por medio.
process.env.TRUST_PROXY_HEADERS = "1";

import { POST, GET } from "../src/app/api/pin/route";
import { getSetting } from "../src/lib/db/core";
import { issueSessionCookie, isPinHashed } from "../src/lib/auth";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean, hint = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label} ${hint}`); }
}

// Cada llamada estrena IP: el rate limit es por IP y la suite hace más de
// cinco peticiones. Sin esto el test mediría el rate limit, no la autorización.
let ipCounter = 0;
function callPost(body: unknown, opts: { cookie?: string } = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-real-ip": `10.0.0.${++ipCounter}`,
  };
  if (opts.cookie) headers["cookie"] = opts.cookie;
  const req = new Request("http://localhost/api/pin", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return POST(req as never);
}

/** Valor de la cookie de sesión tal y como llegaría en una cabecera Cookie. */
function sessionCookieHeader(): string {
  return issueSessionCookie().split(";")[0];
}

async function main() {
  console.log("\n=== Autorización de /api/pin ===");

  // ── 1) Primer uso: sin PIN configurado, cualquiera puede establecer el suyo.
  {
    expect("arranca sin PIN configurado", !getSetting("pin"));
    const res = await callPost({ action: "set", pin: "1234" });
    expect("primer 'set' sin sesión → 200", res.status === 200);
    expect("primer 'set' emite cookie de sesión",
      (res.headers.get("set-cookie") || "").includes("gl_sess="));
    expect("el PIN queda guardado hasheado", isPinHashed(getSetting("pin")));
  }

  const pinAfterFirstSet = getSetting("pin");

  // ── 2) Con PIN configurado: 'set' anónimo se rechaza y no toca nada.
  {
    const res = await callPost({ action: "set", pin: "9999" });
    expect("'set' anónimo sobre PIN existente → 403", res.status === 403);
    expect("'set' anónimo NO cambia el PIN", getSetting("pin") === pinAfterFirstSet);
    expect("'set' anónimo NO emite cookie de sesión",
      !(res.headers.get("set-cookie") || "").includes("gl_sess="));
  }

  // ── 3) 'unset' anónimo se rechaza igual.
  {
    const res = await callPost({ action: "unset" });
    expect("'unset' anónimo → 403", res.status === 403);
    expect("'unset' anónimo NO borra el PIN", getSetting("pin") === pinAfterFirstSet);
    expect("'unset' anónimo NO emite cookie",
      !(res.headers.get("set-cookie") || "").includes("gl_sess="));
  }

  // ── 4) currentPin equivocado tampoco vale.
  {
    const res = await callPost({ action: "set", pin: "9999", currentPin: "0000" });
    expect("'set' con currentPin incorrecto → 403", res.status === 403);
    expect("PIN intacto tras currentPin incorrecto", getSetting("pin") === pinAfterFirstSet);
  }

  // ── 5) currentPin correcto: se permite (clientes sin cookie).
  {
    const res = await callPost({ action: "set", pin: "5678", currentPin: "1234" });
    expect("'set' con currentPin correcto → 200", res.status === 200);
    expect("el PIN cambia de verdad", getSetting("pin") !== pinAfterFirstSet);
    const verify = await callPost({ action: "verify", pin: "5678" });
    expect("el PIN nuevo verifica", (await verify.json()).valid === true);
  }

  // ── 6) Cookie de sesión válida: el camino normal de "Cambiar PIN".
  {
    const res = await callPost({ action: "set", pin: "4321" }, { cookie: sessionCookieHeader() });
    expect("'set' con sesión válida → 200", res.status === 200);
    const verify = await callPost({ action: "verify", pin: "4321" });
    expect("el PIN cambiado con sesión verifica", (await verify.json()).valid === true);
  }

  // ── 7) Una cookie manipulada no es una sesión.
  {
    const res = await callPost({ action: "set", pin: "0000" }, { cookie: "gl_sess=falso.firma" });
    expect("'set' con cookie inválida → 403", res.status === 403);
  }

  // ── 8) 'verify' sigue siendo público: es la puerta de entrada.
  {
    const ok = await callPost({ action: "verify", pin: "4321" });
    expect("'verify' sin sesión sigue funcionando", ok.status === 200);
    const bad = await callPost({ action: "verify", pin: "1111" });
    expect("'verify' con PIN incorrecto → valid:false", (await bad.json()).valid === false);
    expect("'verify' incorrecto no emite cookie",
      !(bad.headers.get("set-cookie") || "").includes("gl_sess="));
  }

  // ── 9) GET sigue siendo público (PinGate lo necesita antes de la sesión).
  {
    const res = await GET();
    const data = await res.json();
    expect("GET informa de que hay PIN configurado", data.configured === true);
    expect("GET no filtra el PIN", !JSON.stringify(data).includes("4321"));
  }

  // ── 10) 'unset' con sesión sí funciona, y deja la app en primer uso.
  {
    const res = await callPost({ action: "unset" }, { cookie: sessionCookieHeader() });
    expect("'unset' con sesión → 200", res.status === 200);
    expect("el PIN queda vacío", !getSetting("pin"));
    const reset = await callPost({ action: "set", pin: "2468" });
    expect("tras 'unset', el primer uso vuelve a estar abierto", reset.status === 200);
  }

  console.log(`\nAutorización del PIN: Passed ${pass} / ${pass + fail}`);
  if (fail) process.exit(1);
}

void main();
