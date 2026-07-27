// Verifica Ticket 1.20: ITV/Seguro/Impuestos autoactualizan las fechas
// del coche, y la nueva columna fecha_impuesto_circulacion + datos
// técnicos (potencia, cilindrada, peso, plazas, color) funcionan.

import { getCar, updateCar } from "../src/lib/db/cars";
import { createExpense, deleteExpense, getExpense } from "../src/lib/db/expenses";
import { getKmStats } from "../src/lib/db/cars";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}
function safeCall<T>(label: string, fn: () => T): T | undefined {
  try { return fn(); }
  catch (err: any) { fail++; console.log(`  ❌ ${label}: ${err?.message || err}`); return undefined; }
}

console.log("\n=== Ticket 1.20: ITV/Seguro/Impuestos auto-actualizan coche ===");

// Estado limpio del Honda Civic id=1.
safeCall("restore fechas coche", () => updateCar(1, {
  fecha_ultima_itv: null, fecha_vencimiento_seguro: null,
  fecha_impuesto_circulacion: null, fecha_matriculacion: null, km_origen: "matriculacion",
}));

// ── 1) ITV ──
const itvDate = "2024-03-15";
const e1 = safeCall("createExpense ITV", () =>
  createExpense(1, "ITV", 50, itvDate, "ITV anual", "", null, null, null),
);
const carAfterItv = getCar(1)!;
expect("ITV → cars.fecha_ultima_itv = fecha gasto", carAfterItv.fecha_ultima_itv === itvDate);
expect("ITV → fecha_vencimiento_seguro NO cambia", carAfterItv.fecha_vencimiento_seguro === null);
if (e1) deleteExpense(e1.id);

// ── 2) Seguro → se guarda con +1 año ──
const segDate = "2024-01-10";
const e2 = safeCall("createExpense Seguro", () =>
  createExpense(1, "Seguro", 600, segDate, "Seguro anual", "", null, null, null),
);
const carAfterSeg = getCar(1)!;
expect("Seguro → fecha_vencimiento_seguro = fecha + 1 año",
  carAfterSeg.fecha_vencimiento_seguro === "2025-01-10");
if (e2) deleteExpense(e2.id);

// ── 3) Impuestos SIN checkbox → no actualiza fecha_impuesto_circulacion ──
const e3 = safeCall("createExpense Impuestos sin flag", () =>
  createExpense(1, "Impuestos", 150, "2024-04-20", "Multa", "", null, null, null),
);
const carAfter3 = getCar(1)!;
expect("Impuestos sin flag → fecha_impuesto_circulacion NO cambia",
  carAfter3.fecha_impuesto_circulacion === null);
if (e3) deleteExpense(e3.id);

// ── 4) Impuestos CON checkbox → actualiza fecha_impuesto_circulacion ──
const e4 = safeCall("createExpense Impuestos CON flag", () =>
  createExpense(1, "Impuestos", 150, "2024-04-20", "IVTM", "", null, null, null,
    { impuestoCirculacion: true }),
);
const carAfter4 = getCar(1)!;
expect("Impuestos con flag → fecha_impuesto_circulacion = fecha gasto",
  carAfter4.fecha_impuesto_circulacion === "2024-04-20");
if (e4) deleteExpense(e4.id);

// ── 5) Datos técnicos del coche (Ticket 1.20) ──
const updated = safeCall("updateCar con datos técnicos", () => updateCar(1, {
  potencia_cv: 140, cilindrada_cc: 1800, peso_kg: 1320, plazas: 5, color: "Negro",
}));
const carWithTech = getCar(1)!;
expect("potencia_cv persistido", carWithTech.potencia_cv === 140);
expect("cilindrada_cc persistido", carWithTech.cilindrada_cc === 1800);
expect("peso_kg persistido", carWithTech.peso_kg === 1320);
expect("plazas persistido", carWithTech.plazas === 5);
expect("color persistido", carWithTech.color === "Negro");

// ── 6) Update nullos (borrar) ──
safeCall("updateCar con nulls", () => updateCar(1, {
  potencia_cv: null, cilindrada_cc: null, peso_kg: null, plazas: null, color: null,
}));
const carCleared = getCar(1)!;
expect("potencia_cv null tras update null", carCleared.potencia_cv === null);
expect("color null tras update null", carCleared.color === null);

// ── 7) KmStats sigue funcionando con campos nuevos ──
const stats = safeCall("getKmStats", () => getKmStats(1));
expect("KmStats retorna avgPerYear (null o number)",
  stats === null || typeof stats.avgPerYear === "number" || stats.avgPerYear === null);

// ── 8) Idempotencia de migración: PRAGMA tiene las 6 nuevas columnas ──
const cols = safeCall("PRAGMA table_info cars", () =>
  Array.from(new (require("better-sqlite3"))("/opt/garageledger/data/garageledger.db", { readonly: true })
    .prepare("PRAGMA table_info(cars)").all()).map((c: any) => c.name),
) || [];
for (const c of ["fecha_impuesto_circulacion", "potencia_cv", "cilindrada_cc", "peso_kg", "plazas", "color"]) {
  expect(`BD tiene columna ${c}`, cols.includes(c));
}

// ── 9) Cleanup: deja el coche como estaba ──
safeCall("cleanup final", () => updateCar(1, {
  fecha_ultima_itv: "2025-03-15", fecha_vencimiento_seguro: "2026-12-01",
  fecha_impuesto_circulacion: null, fecha_matriculacion: null, km_origen: "matriculacion",
  potencia_cv: null, cilindrada_cc: null, peso_kg: null, plazas: null, color: null,
}));

console.log(`\nTicket 1.20: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
