// audit:S-4 — Las cabeceras de seguridad se declaran en next.config.ts y no
// las emite ningún código de la app, así que es fácil que desaparezcan en un
// refactor del config sin que nadie se entere hasta el siguiente pentest.
// Este test lee la configuración de verdad y fija lo que tiene que salir.

import "./lib/test-db";  // primera línea: fija DB_PATH antes de cargar src/lib/db

import nextConfig from "../next.config";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean, hint = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label} ${hint}`); }
}

async function main() {
  console.log("\n=== Cabeceras de seguridad ===");

  expect("next.config declara headers()", typeof nextConfig.headers === "function");
  if (typeof nextConfig.headers !== "function") {
    console.log(`\nCabeceras de seguridad: Passed ${pass} / ${pass + fail}`);
    process.exit(1);
  }

  const rules = await nextConfig.headers();
  const catchAll = rules.find((r) => r.source === "/:path*");
  expect("hay una regla que cubre toda la app", !!catchAll);

  const headers = new Map((catchAll?.headers ?? []).map((h) => [h.key, h.value]));

  // ── Las cabeceras que tienen que estar, con el valor que importa.
  const required: [string, string | RegExp][] = [
    ["X-Frame-Options", "DENY"],
    ["X-Content-Type-Options", "nosniff"],
    ["Referrer-Policy", /^(same-origin|no-referrer|strict-origin)/],
    ["Permissions-Policy", /camera=\(\)/],
    ["Content-Security-Policy", /./],
  ];
  for (const [key, matcher] of required) {
    const value = headers.get(key);
    const ok = typeof matcher === "string" ? value === matcher : !!value && matcher.test(value);
    expect(`${key} presente y con el valor esperado`, ok, `(${value ?? "ausente"})`);
  }

  // ── Directivas de la CSP que no pueden relajarse sin darse cuenta.
  const csp = headers.get("Content-Security-Policy") ?? "";
  const directives: [string, string][] = [
    ["default-src 'self'",   "nada carga de fuera por defecto"],
    ["connect-src 'self'",   "los datos no pueden exfiltrarse a un tercero"],
    ["object-src 'none'",    "sin plugins"],
    ["base-uri 'self'",      "sin secuestro de rutas relativas"],
    ["form-action 'self'",   "los formularios no envían a otro dominio"],
    ["frame-ancestors 'none'", "sin clickjacking"],
  ];
  for (const [directive, why] of directives) {
    expect(`CSP: ${directive} (${why})`, csp.includes(directive));
  }

  // 'unsafe-eval' a secas sí sería un problema; 'wasm-unsafe-eval' es lo que
  // necesitan opencv-js y pdfjs para el escaneo de documentos.
  expect("CSP no permite 'unsafe-eval' de JavaScript",
    !/script-src[^;]*'unsafe-eval'/.test(csp), `(${csp.match(/script-src[^;]*/)?.[0]})`);
  expect("CSP permite WebAssembly (escaneo de documentos)",
    csp.includes("'wasm-unsafe-eval'"));

  console.log(`\nCabeceras de seguridad: Passed ${pass} / ${pass + fail}`);
  if (fail) process.exit(1);
}

void main();
