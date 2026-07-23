// Verifica el flujo end-to-end del form de crear/editar coche con los
// nuevos campos fecha_matriculacion y km_origen (Ticket 1.19 follow-up).

import { getKmStats, getCar, updateCar } from "../src/lib/db/cars";
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

console.log("\n=== Flujo crear/editar coche: km_origen ===");

// ── 1) Sin fecha, sin origen explícito → default 'matriculacion', sin avg ──
safeCall("restore origen default", () => updateCar(1, { km_origen: "matriculacion", fecha_matriculacion: null }));
const s1 = safeCall("getKmStats default", () => getKmStats(1))!;
expect("default → km_origen='matriculacion'", getCar(1)?.km_origen === "matriculacion");
expect("default sin fecha → avgPerMonth null", s1.avgPerMonth === null);
expect("default sin fecha → source='sin_datos'", s1.source === "sin_datos");

// ── 2) Cambiar km_origen a primer_registro → calcula desde gastos existentes ──
safeCall("cambiar a primer_registro", () => updateCar(1, { km_origen: "primer_registro" }));
const s2 = safeCall("getKmStats primer_registro", () => getKmStats(1))!;
expect("después de cambiar a primer_registro → km_origen actualizado", getCar(1)?.km_origen === "primer_registro");
expect("primer_registro → source='primer_registro'", s2.source === "primer_registro");
expect("primer_registro con gastos → avgPerMonth > 0", s2.avgPerMonth !== null && s2.avgPerMonth > 0);
expect("sourceLabel = desde YYYY-MM-DD", s2.sourceLabel !== null && /^desde \d{4}-\d{2}-\d{2}$/.test(s2.sourceLabel!));

// ── 3) Volver a matriculacion con fecha histórica → calcula correctamente ──
safeCall("matriculacion 2009-01-15", () => updateCar(1, { km_origen: "matriculacion", fecha_matriculacion: "2009-01-15" }));
const s3 = safeCall("getKmStats matriculacion 2009", () => getKmStats(1))!;
expect("después de cambiar a matriculacion 2009 → km_origen='matriculacion'", getCar(1)?.km_origen === "matriculacion");
expect("fecha_matriculacion persistida", getCar(1)?.fecha_matriculacion === "2009-01-15");
expect("source='matriculacion'", s3.source === "matriculacion");
expect("months >= 200 (2009-01 → 2026-07)", s3.months !== null && s3.months >= 200);
expect("avgPerMonth = round(total/months)", s3.avgPerMonth === Math.round(s3.total / (s3.months || 1)));
expect("sourceLabel = 'desde 2009-01-15'", s3.sourceLabel === "desde 2009-01-15");

// ── 4) Cero jerga: el objeto Car tiene los campos con nombres legibles ──
const car = getCar(1)!;
expect("Car.fecha_matriculacion es string o null", typeof car.fecha_matriculacion === "string" || car.fecha_matriculacion === null);
expect("Car.km_origen es union conocido", car.km_origen === "matriculacion" || car.km_origen === "primer_registro");

// ── 5) Cero jerga en la salida de getKmStats: campos legibles en español ──
expect("KmStats.total === car.km_actuales", s3.total === car.km_actuales);
expect("KmStats.thisMonth es number|null", typeof s3.thisMonth === "number" || s3.thisMonth === null);
expect("KmStats.avgPerMonth es number|null", typeof s3.avgPerMonth === "number" || s3.avgPerMonth === null);
expect("KmStats.months es number|null", typeof s3.months === "number" || s3.months === null);
expect("KmStats.source es union conocido",
  s3.source === "matriculacion" || s3.source === "primer_registro" || s3.source === "sin_datos");
expect("KmStats.sourceLabel es string|null", typeof s3.sourceLabel === "string" || s3.sourceLabel === null);

// ── 6) Simula el flujo del form: crear gasto, recargar, sourceLabel se actualiza ──
const before = getKmStats(1)!;
const exp = createExpense(1, "Carburante", 50, "2026-07-23", "Test edit flow", "", 40, before.total + 2000, null);
const after = getKmStats(1)!;
expect("total sube tras createExpense (form flow)", after.total === before.total + 2000);
if (exp) deleteExpense(exp.id);

// ── 7) Cleanup: dejar el coche en estado neutro ──
safeCall("restore origen default (final)", () =>
  updateCar(1, { km_origen: "matriculacion", fecha_matriculacion: null }),
);

console.log(`\nFlujo crear/editar coche: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
