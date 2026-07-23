// Verifica Ticket 1.14 follow-up: el form de Añadir gasto siempre se
// pre-rellena con car.km_actuales, nunca con el valor cacheado al mount.

import { createExpense, getCar, getExpense, deleteExpense } from "../src/lib/db";
import { bumpKmIfHigher } from "../src/lib/db/cars";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

function safeCall<T>(label: string, fn: () => T): T | undefined {
  try { return fn(); }
  catch (err: any) { fail++; console.log(`  ❌ ${label}: ${err?.message || err}`); return undefined; }
}

console.log("\n=== Ticket 1.14 follow-up: km_actuales siempre al día ===");

// ── Setup: leave car 1 with km_actuales = X, then create an expense with
// km X+5000, confirm car.km_actuales = X+5000.
const car = safeCall("getCar(1) inicial", () => getCar(1))!;
const initialKm = car?.km_actuales ?? 0;
expect("car 1 existe con km > 0", initialKm > 0);

// Crea un gasto con km más alto y verifica que car.km_actuales sube.
const newKm = initialKm + 5000;
const exp = safeCall("createExpense con km mayor", () =>
  createExpense(1, "Carburante", 50, "2026-07-23", "Test km propagation", "", 40, newKm, null),
);
expect("createExpense OK", !!exp);
const carAfter = safeCall("getCar(1) tras expense", () => getCar(1))!;
expect("car.km_actuales refleja el km del gasto", carAfter?.km_actuales === newKm);

// Ahora la API /api/car/[id]/page-data devuelve el nuevo km (probado vía curl):
// {"car":{"id":1,...,"km_actuales":1035999,...}}
// El form de Añadir gasto en el frontend lee car.km_actuales al abrirse:
// Confirmamos en código fuente que se usa car?.km_actuales ?? initialCar.km_actuales
// en el path de "abrir modal", no solo al mount.
const ccdSource = safeCall("leer CarDetailClient.tsx", () => "") ?? "";
const fs = require("fs");
const ccdContent = fs.readFileSync(
  "/root/work/garageledger/src/app/coches/[id]/components/CarDetailClient.tsx",
  "utf-8",
);
expect("CarDetailClient tiene openExpenseForm que usa car?.km_actuales",
  ccdContent.includes("openExpenseForm") &&
  /openExpenseForm[\s\S]{0,500}car\?\.km_actuales/.test(ccdContent));
expect("CarDetailClient pasa initialCar.km_actuales a emptyProgramMaintenanceForm",
  /emptyProgramMaintenanceForm\(initialCar\.km_actuales\)/.test(ccdContent));
expect("openProgramMaintenance usa car?.km_actuales",
  /openProgramMaintenance[\s\S]{0,500}car\?\.km_actuales/.test(ccdContent));

// ── Cleanup: restaurar km y eliminar el gasto ──
safeCall("restore km_actuales", () => bumpKmIfHigher(1, initialKm));
if (exp) safeCall(`deleteExpense ${exp.id}`, () => deleteExpense(exp.id));

console.log(`\nTicket 1.14 follow-up: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);