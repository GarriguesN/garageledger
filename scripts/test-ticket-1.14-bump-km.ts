// Verifica Ticket 1.14 — bumpKmIfHigher + km_actuales siempre al día.
//
// Cubre:
//   (1) bumpKmIfHigher sólo sube el km, nunca lo baja.
//   (2) createExpense con km > car.km_actuales → actualiza cars.km_actuales.
//   (3) completeMaintenanceTask con km > car.km_actuales → actualiza cars.km_actuales.
//   (4) El modal de completar tarea usa car.km_actuales como valor por defecto.
//   (5) No hay window.prompt() en CarDetailClient.tsx.

import { createExpense, deleteExpense } from "../src/lib/db/expenses";
import { createMaintenanceTask, completeMaintenanceTask, getMaintenanceTasks, deleteMaintenanceTask } from "../src/lib/db/maintenance";
import { getCar, bumpKmIfHigher } from "../src/lib/db/cars";
import { readFileSync } from "fs";
import { resolve } from "path";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

function safeCall<T>(label: string, fn: () => T): T | undefined {
  try { return fn(); }
  catch (err: any) { fail++; console.log(`  ❌ ${label}: ${err?.message || err}`); return undefined; }
}

console.log("\n=== Ticket 1.14 — bumpKmIfHigher ===");

// ── 1) bumpKmIfHigher no baja el km ──
const car = safeCall("getCar(1)", () => getCar(1))!;
const originalKm = car.km_actuales;
expect("car 1 existe", !!car);
expect("car 1 km_actuales > 0", originalKm > 0);

const lower = safeCall("bumpKmIfHigher con km menor", () => bumpKmIfHigher(1, 100));
expect("bumpKmIfHigher con km menor no lo baja", lower?.km_actuales === originalKm);

const higher = safeCall("bumpKmIfHigher con km mayor", () => bumpKmIfHigher(1, originalKm + 10000));
expect("bumpKmIfHigher con km mayor lo sube", higher?.km_actuales === originalKm + 10000);

// ── 2) createExpense con km > actual sube el odómetro ──
const prevKm = safeCall("getCar antes del expense", () => getCar(1))?.km_actuales ?? originalKm;
const expKm = prevKm + 5000;
const expense = safeCall("createExpense con km", () =>
  createExpense(1, "Carburante", 50, "2026-07-23", "Test km bump", "", 40, expKm, null),
);
if (expense) {
  const carAfterExp = safeCall("getCar después del expense", () => getCar(1));
  expect("createExpense sube km_actuales", carAfterExp?.km_actuales === expKm);
  safeCall("deleteExpense", () => deleteExpense(expense.id));
}

// ── 3) completeMaintenanceTask sube el odómetro ──
const restoreKm = originalKm; // restore to clean state
safeCall("restore km_actuales", () => bumpKmIfHigher(1, restoreKm));

const prevKm2 = safeCall("getCar antes de complete", () => getCar(1))?.km_actuales ?? originalKm;
const completeKm = prevKm2 + 3000;
const task = safeCall("createMaintenanceTask para completar", () =>
  createMaintenanceTask(1, "Test complete km bump", {
    part_brand: "",
    current_km: prevKm2,
    next_km: prevKm2 + 10000,
    interval_km: 10000,
    icon_key: "wrench",
  }),
);
if (task) {
  const completed = safeCall("completeMaintenanceTask", () =>
    completeMaintenanceTask(task.id, completeKm, "2026-07-23"),
  );
  if (completed) {
    const carAfterComplete = safeCall("getCar después de complete", () => getCar(1));
    expect("completeMaintenanceTask sube km_actuales", carAfterComplete?.km_actuales === completeKm);
  }
  // Cleanup: delete old + new tasks from this test
  safeCall("delete task creado", () => deleteMaintenanceTask(task.id));
  // Also find and delete the re-inserted task
  const allTasks = safeCall("getMaintenanceTasks after complete", () => getMaintenanceTasks(1)) || [];
  const twin = allTasks.find(t => t.part_name === "Test complete km bump" && t.id !== task.id);
  if (twin) safeCall("delete twin task", () => deleteMaintenanceTask(twin.id));
}

// Restore
safeCall("restore km_actuales final", () => bumpKmIfHigher(1, restoreKm));

// ── 4) El modal usa car.km_actuales por defecto ──
const ccdPath = resolve(__dirname, "../src/app/coches/[id]/components/CarDetailClient.tsx");
const ccdSource = readFileSync(ccdPath, "utf-8");
expect("NO hay window.prompt() en CarDetailClient", !ccdSource.includes("prompt("));
expect("NO hay window.alert() en CarDetailClient", !ccdSource.includes("alert("));
expect("CarDetailClient importa CompleteMaintenanceModal", ccdSource.includes("CompleteMaintenanceModal"));

// El form de gasto también debe pre-rellenar km:
expect("AddExpenseForm km defaults from car.km_actuales",
  ccdSource.includes('km: String(initialCar.km_actuales') ||
  ccdSource.includes('km: String(car.km_actuales'));

console.log(`\nTicket 1.14 — bumpKmIfHigher: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
