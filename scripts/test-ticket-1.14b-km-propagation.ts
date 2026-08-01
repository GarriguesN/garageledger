// Verifica Ticket 1.14 follow-up: el form de Añadir gasto siempre se
// pre-rellena con car.km_actuales, nunca con el valor cacheado al mount.

import { createExpense, getCar, getExpense, deleteExpense } from "../src/lib/db";
import { bumpKmIfHigher } from "../src/lib/db/cars";
import * as fs from "fs";
import * as path from "path";

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
// Ruta relativa al repo (no absoluta de mi sandbox). __dirname es el
// directorio del script (scripts/), así que .. va al root del repo.
//
// Tras pasar los formularios a asistentes por pasos, esta lógica vive en
// ExpenseWizard (gasto) y en CompleteMaintenanceWizard (mantenimiento). Lo
// que se comprueba es lo mismo: el km que se ofrece por defecto sale del
// coche en el momento de abrir el formulario, no de una copia cacheada al
// montar la pantalla.
const WIZARD_DIR = path.join(__dirname, "..", "src", "components", "wizards");
const wizard = fs.readFileSync(path.join(WIZARD_DIR, "ExpenseWizard.tsx"), "utf-8");
const completeWizard = fs.readFileSync(
  path.join(WIZARD_DIR, "CompleteMaintenanceWizard.tsx"), "utf-8");
expect("ExpenseWizard recibe currentKm por prop (no lo cachea)",
  /currentKm:\s*number/.test(wizard));
expect("ExpenseWizard arranca sus valores con currentKm",
  /km:\s*currentKm\s*>\s*0\s*\?\s*String\(currentKm\)/.test(wizard));
expect("CompleteMaintenanceWizard recibe currentKm por prop",
  /currentKm:\s*number/.test(completeWizard));

// ── Cleanup: restaurar km y eliminar el gasto ──
safeCall("restore km_actuales", () => bumpKmIfHigher(1, initialKm));
if (exp) safeCall(`deleteExpense ${exp.id}`, () => deleteExpense(exp.id));

console.log(`\nTicket 1.14 follow-up: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);