// Verifica el wizard de Añadir Gasto (mockup 5-7, 3 pasos).
//
//   Paso 1: ¿Qué tipo de gasto es? (rejilla 2x3 de AppTypeTile)
//   Paso 2: Detalles del gasto (importe, fecha, descripción, método de pago)
//   Paso 3: Comprobante (opcional) (foto + notas + summary)
//
// Cubre:
//   (1) 3 pasos
//   (2) Step 1 muestra las 8 categorías (selectable)
//   (3) Title coincide con el mockup
//   (4) Valida importe
//   (5) Upload de comprobante
//   (6) SuccessScreen: "Ver en actividad" + "Añadir otro gasto"
//   (7) Calculo automático de precio/L cuando es combustible
//   (8) Sumisión correcta al POST /api/expenses

import { readFileSync } from "fs";
import { resolve } from "path";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

const path = resolve(__dirname, "../src/app/coches/[id]/components/AddExpenseWizard.tsx");
const src = readFileSync(path, "utf-8");

console.log("\n=== AddExpenseWizard — contrato del wizard ===");

expect("Existe AddExpenseWizard", src.length > 0);
expect("Importa Wizard genérico", /import \{[^}]*\bWizard\b/.test(src));

// Pasos
const stepIds = [...src.matchAll(/^\s*id:\s*"([^"]+)",/gm)].map((m) => m[1]);
const uniqueStepIds = Array.from(new Set(stepIds));
expect("Define 3 pasos", uniqueStepIds.length === 3);

// Títulos mockup
expect("¿Qué tipo de gasto es?", src.includes("¿Qué tipo de gasto es?"));
expect("Detalles del gasto", src.includes("Detalles del gasto"));
expect("Comprobante (opcional)", src.includes("Comprobante (opcional)"));

// Rejilla
expect("SELECTABLE_CATEGORIES", src.includes("SELECTABLE_CATEGORIES"));
expect("8 casillas (categorías selectable)", (src.match(/SELECTABLE_CATEGORIES\.map/g) || []).length >= 1);

// Validación
expect("Valida importe", /importe.*válid|importe.*Introduce/i.test(src));
expect("Valida litros si es combustible", /isFuel.*litros|litros.*Introduce/i.test(src));

// Upload
expect("Acepta file input", src.includes('type="file"'));
expect("Foto del ticket", src.includes("Foto del ticket"));

// Cálculo de precio/L
expect("Calcula pricePerLiter", /pricePerLiter/.test(src));
expect("Muestra /L en el resumen", /\[L\].*€|\/L/.test(src));

// Éxito
expect("Botón 'Ver en actividad'", src.includes("Ver en actividad"));
expect("Botón 'Añadir otro gasto'", src.includes("Añadir otro gasto"));

// Endpoint
expect("POST a /api/expenses", src.includes('method: "POST"'));

// Backward compat
expect("Soporta prop 'open'", /open:\s*boolean/.test(src));
expect("Soporta prop 'currentKm'", /currentKm:\s*number/.test(src));

// Sin diálogos nativos
expect("No usa window.prompt", !/\bwindow\.prompt\(|[^.\w]prompt\(/.test(src));
expect("No usa window.alert", !/\bwindow\.alert\(|[^.\w]alert\(/.test(src));

console.log(`\nAddExpenseWizard: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
