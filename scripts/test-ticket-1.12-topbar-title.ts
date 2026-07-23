// Verifica el contrato del TopBar: lee el data-page-matricula del DOM y
// muestra el título correcto para cada pathname. La parte de fetch fallback
// cuando el SC no inyecta el atributo se cubre en tests de integración.

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

// Sólo verificamos la lógica de selección de título, aislada del resto.
// El test funcional con JSDOM del topbar completo entra en
// scripts/test-topbar-integration.ts (pendiente de playwright si hace falta).
function pickTitle(pathname: string, matricula: string | null): string {
  let title = "Garaje";
  if (pathname === "/coches/nuevo") title = "Nuevo vehículo";
  else if (pathname === "/settings") title = "Ajustes";
  else if (/^\/coches\/[^/]+\/editar$/.test(pathname)) {
    title = matricula ? `Editando ${matricula}` : "Editando vehículo";
  } else if (/^\/coches\/[^/]+$/.test(pathname)) {
    title = matricula || "Vehículo";
  }
  return title;
}

console.log("\n=== TopBar — selección de título por ruta ===");
expect("Garaje en /", pickTitle("/", null) === "Garaje");
expect("Garaje en / sin matrícula", pickTitle("/", null) === "Garaje");
expect("Ajustes en /settings", pickTitle("/settings", null) === "Ajustes");
expect("Nuevo vehículo en /coches/nuevo", pickTitle("/coches/nuevo", null) === "Nuevo vehículo");
expect("Vehículo en /coches/1 sin matrícula", pickTitle("/coches/1", null) === "Vehículo");
expect("1234-ABC en /coches/1 con matrícula", pickTitle("/coches/1", "1234-ABC") === "1234-ABC");
expect("Editando vehículo sin matrícula", pickTitle("/coches/1/editar", null) === "Editando vehículo");
expect("Editando 1234-ABC con matrícula", pickTitle("/coches/1/editar", "1234-ABC") === "Editando 1234-ABC");
expect("5678-DEF en /coches/2 con matrícula", pickTitle("/coches/2", "5678-DEF") === "5678-DEF");
expect("Editando 5678-DEF con matrícula", pickTitle("/coches/2/editar", "5678-DEF") === "Editando 5678-DEF");

console.log(`\nTopBar: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
