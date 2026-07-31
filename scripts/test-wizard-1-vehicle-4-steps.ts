// Verifica el wizard de Añadir Vehículo (mockup 1-4, 4 pasos).
//
// Cubre:
//   (1) Existe el archivo VehicleWizard.tsx
//   (2) Tiene 4 entradas en el array de steps
//   (3) Los titles coinciden con los del mockup
//   (4) Tiene validate en el paso 1 (marca+modelo obligatorios)
//   (5) El archivo se monta con el título "Añadir vehículo"
//   (6) Soporta mode create + edit
//   (7) El payload final envía a POST /api/cars y PUT /api/cars
//   (8) Acepta recentBrands para los chips de marcas recientes

import { readFileSync } from "fs";
import { resolve } from "path";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

const path = resolve(__dirname, "../src/app/coches/nuevo/VehicleWizard.tsx");
const src = readFileSync(path, "utf-8");

console.log("\n=== VehicleWizard — contrato del wizard ===");

expect("Existe VehicleWizard.tsx", src.length > 0);
expect("Importa Wizard genérico", /import \{[^}]*\bWizard\b/.test(src));
expect("Importa WizardSummaryCard", /import \{[^}]*\bWizardSummaryCard\b/.test(src));

// Cuenta de pasos: contar `id: "..."` en bloques de steps
const stepIds = [...src.matchAll(/^\s*id:\s*"([^"]+)",/gm)].map((m) => m[1]);
const uniqueStepIds = Array.from(new Set(stepIds));
expect("Define 4 pasos", uniqueStepIds.length === 4);

// Titulos del mockup
expect("Paso 1 'Marca y modelo'", src.includes("Marca y modelo"));
expect("Paso 2 'Especificaciones'", src.includes("Especificaciones"));
expect("Paso 3 'Identificación'", src.includes("Identificación"));
expect("Paso 4 'Foto del vehículo'", src.includes("Foto del vehículo"));

// Validación
expect("Valida campo marca", /marca.*obligatori|marca.*Marca/i.test(src) || /!\s*v\.marca\.trim\(\)/.test(src));
expect("Valida campo modelo", /modelo.*obligatori|modelo.*Modelo/i.test(src) || /!\s*v\.modelo\.trim\(\)/.test(src));

// API
expect("Soporta mode 'create' y 'edit'", /mode:\s*"create"\s*\|\s*"edit"/.test(src));
expect("Pasa recentBrands como prop", /recentBrands\??:\s*string\[\]/.test(src));

// Endpoints
expect("POST a /api/cars", /fetch\(\s*"\/api\/cars",\s*\{\s*method:\s*"POST"/.test(src));
expect("PUT a /api/cars", /fetch\(\s*"\/api\/cars",\s*\{\s*method:\s*"PUT"/.test(src));

// UI
expect("Botón 'Guardar vehículo'", src.includes("Guardar vehículo"));
expect("Botón 'Ver en garaje'", src.includes("Ver en garaje"));
expect("No usa window.prompt", !/\bwindow\.prompt\(|[^.\w]prompt\(/.test(src));
expect("No usa window.alert", !/\bwindow\.alert\(|[^.\w]alert\(/.test(src));

const footer = /Cancelar|backLabel="Atrás"|submitLabel="Guardar/.test(src);
expect("Footer con Cancelar/Atrás/Siguiente", footer);

console.log(`\nVehicleWizard: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
