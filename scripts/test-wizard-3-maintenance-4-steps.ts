// Verifica el wizard de Añadir Mantenimiento (mockup 11-14, 4 pasos).
//
//   Paso 1: Tipo de mantenimiento (grid 3x2: aceite/frenos/neumáticos/batería/ITV/personalizado)
//   Paso 2: Detalles del servicio (coste, taller, taller/DIY, fecha)
//   Paso 3: Próximo mantenimiento (Km/Tiempo, interval, recordar)
//   Paso 4: Resumen del mantenimiento

import { readFileSync } from "fs";
import { resolve } from "path";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

const path = resolve(__dirname, "../src/app/coches/[id]/mantenimiento/nuevo/MaintenanceWizard.tsx");
const src = readFileSync(path, "utf-8");

console.log("\n=== MaintenanceWizard — contrato del wizard ===");

expect("Existe MaintenanceWizard", src.length > 0);
expect("Importa Wizard genérico", /import \{[^}]*\bWizard\b/.test(src));

// Pasos
const stepIds = [...src.matchAll(/^\s*id:\s*"([^"]+)",/gm)].map((m) => m[1]);
const uniqueStepIds = Array.from(new Set(stepIds));
expect("Define 4 pasos", uniqueStepIds.length === 4);

// Títulos mockup
expect("'Tipo de mantenimiento'", src.includes("Tipo de mantenimiento"));
expect("'Detalles del servicio'", src.includes("Detalles del servicio"));
expect("'Próximo mantenimiento'", src.includes("Próximo mantenimiento"));
expect("'Resumen del mantenimiento'", src.includes("Resumen del mantenimiento"));

// Tiles del mockup (6)
expect("Tile 'Cambio de aceite'", src.includes("Cambio de aceite"));
expect("Tile 'Frenos'", src.includes('"Frenos"') || src.includes("Frenos"));
expect("Tile 'Neumáticos'", src.includes("Neumáticos"));
expect("Tile 'Batería'", src.includes("Batería"));
expect("Tile 'Inspección (ITV)'", src.includes("Inspección (ITV)"));
expect("Tile 'Personalizado'", src.includes("Personalizado"));

// Segmentado Taller/DIY
expect("Segmentado Taller/DIY", src.includes("taller") && src.includes("diy"));

// Próximo mantenimiento
expect("Selector Km/Tiempo", src.includes("Recordarme por") || /km.*tiempo|tiempo.*km/s.test(src));

// Auto-cálculo del siguiente
expect("Calcula nextKm", /computedNextKm/.test(src));
expect("Calcula nextDate", /computedNextDate/.test(src));

// API
expect("POST a /api/maintenance", src.includes('method: "POST"') && src.includes("/api/maintenance"));
expect("Si hay coste, crea gasto", /fetch\("\/api\/expenses"/.test(src));

// Éxito
expect("Botón 'Ver mantenimiento'", src.includes("Ver mantenimiento"));
expect("Botón 'Añadir otro'", src.includes("Añadir otro"));

// Mantiene contrato open/currentKm
expect("Soporta prop 'carId'", /carId:\s*number/.test(src));
expect("Soporta prop 'currentKm'", /currentKm:\s*number/.test(src));

// Sin diálogos nativos
expect("No usa window.prompt", !/\bwindow\.prompt\(|[^.\w]prompt\(/.test(src));
expect("No usa window.alert", !/\bwindow\.alert\(|[^.\w]alert\(/.test(src));

console.log(`\nMaintenanceWizard: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
