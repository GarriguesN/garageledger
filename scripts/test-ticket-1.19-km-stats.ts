import "./lib/test-db";  // primera línea: fija DB_PATH antes de cargar src/lib/db
// Verifica la card de kilometraje (totales / este mes / media mensual).

import { getKmStats, getCar } from "../src/lib/db/cars";
import { createExpense, deleteExpense } from "../src/lib/db/expenses";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

function safeCall<T>(label: string, fn: () => T): T | undefined {
  try { return fn(); }
  catch (err: any) { fail++; console.log(`  ❌ ${label}: ${err?.message || err}`); return undefined; }
}

console.log("\n=== Card de Kilometraje ===");

// Estado inicial (Honda Civic id=1).
const initial = safeCall("getKmStats inicial", () => getKmStats(1));
if (initial) {
  expect("total > 0", initial.total > 0);
  expect("total === car.km_actuales", initial.total === getCar(1)?.km_actuales);
  expect("months >= 1 si hay fecha", initial.months === null || initial.months >= 1);
  expect("avg = round(total/months) si hay meses", initial.months === null || initial.avgPerMonth === Math.round(initial.total / initial.months));
}

// Crea un gasto con km alto y verifica que los stats se actualizan.
const before = safeCall("getKmStats before", () => getKmStats(1))!;
const newKm = before.total + 2000;
// La fecha es la de HOY, no una fija: la comprobación de abajo mira los km
// del mes en curso, así que con una fecha escrita a mano el test empieza a
// fallar solo el día que cambia el mes.
const today = new Date().toISOString().slice(0, 10);
const exp = safeCall("createExpense con km alto", () =>
  createExpense(1, "Carburante", 50, today, "Test km stats", "", 40, newKm, null),
);
const after = safeCall("getKmStats after", () => getKmStats(1));
if (after) {
  expect("total sube tras createExpense", after.total === newKm);
  expect("months >= 1", after.months === null || after.months >= 1);
  if (before.months === after.months) {
    expect("avgPerMonth sube", after.avgPerMonth! >= before.avgPerMonth!);
  }
}

// thisMonth: con el gasto nuevo, debe haber km en el mes actual.
if (after) {
  // 2026-07-23 está dentro del mes actual (date.now ~ 2026-07-23)
  const monthStart = new Date().toISOString().slice(0, 7);
  expect(`today está en ${monthStart}`, new Date().toISOString().slice(0, 7) === monthStart);
  expect("thisMonth !== null tras crear gasto este mes", after.thisMonth !== null);
}

// ── audit:B-1 — Un gasto con fecha futura no puede romper la card ─────────
//
// El formulario deja poner cualquier fecha. Antes, un gasto de dentro de unos
// meses entraba en el cálculo de "este mes" (las fechas se comparan como
// texto), se tomaba como última lectura y, al ser sus km menores que los de
// meses anteriores, la resta salía negativa y thisMonth se quedaba en null.
// Este es el caso exacto que había en la BD de desarrollo: un gasto con fecha
// 2026-12-31 dejaba la card de kilometraje en blanco.
{
  const antes = safeCall("getKmStats antes del gasto futuro", () => getKmStats(1))!;

  const futuro = new Date();
  futuro.setMonth(futuro.getMonth() + 5);
  const fechaFutura = futuro.toISOString().slice(0, 10);
  // Km deliberadamente BAJOS: es lo que hacía que la resta saliera negativa.
  const kmBajos = 100;
  const gastoFuturo = safeCall("createExpense con fecha futura", () =>
    createExpense(1, "Carburante", 50, fechaFutura, "Gasto adelantado", "", 40, kmBajos, null),
  );

  const despues = safeCall("getKmStats con gasto futuro", () => getKmStats(1));
  if (despues) {
    expect("un gasto futuro no anula thisMonth", despues.thisMonth === antes.thisMonth);
    expect("un gasto futuro no cambia la media", despues.avgPerMonth === antes.avgPerMonth);
    expect("thisMonth nunca es negativo", despues.thisMonth === null || despues.thisMonth >= 0);
  }

  if (gastoFuturo) safeCall("deleteExpense futuro", () => deleteExpense(gastoFuturo.id));
}

// Cleanup.
if (exp) safeCall("deleteExpense", () => deleteExpense(exp.id));

console.log(`\nCard de Kilometraje: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
