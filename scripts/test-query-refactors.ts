// Las optimizaciones de consulta no pueden cambiar el resultado.
//
// `getMonthlyKm` pasó de recorrer el array entero dentro del bucle a un
// puntero, y `getMaintenanceHistory` de una consulta por fila a una sola con
// subconsulta. Las dos reescrituras son fáciles de dar por buenas mirándolas y
// difíciles de dar por buenas de verdad, así que aquí se comparan contra una
// implementación de referencia escrita de la forma ingenua, sobre datos
// generados al azar.

import "./lib/test-db";  // primera línea: fija DB_PATH antes de cargar src/lib/db

import { getMonthlyKm, getTimeline } from "../src/lib/db/metrics";
import { getMaintenanceHistory, createMaintenanceTask, updateMaintenanceTask } from "../src/lib/db/maintenance";
import { createExpense, getExpenses, MAX_EXPENSES_LIMIT } from "../src/lib/db/expenses";
import { createCar } from "../src/lib/db/cars";
import { getDb } from "../src/lib/db/core";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean, hint = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label} ${hint}`); }
}

/** La versión ingenua de getMonthlyKm, tal y como estaba escrita antes:
 *  filter + some sobre TODO el array en cada iteración del bucle. */
function monthlyKmReference(carId: number, months = 6): { month: string; km: number }[] {
  const rows = getDb().prepare(
    `SELECT strftime('%Y-%m', date) as month, MAX(km) as km
     FROM expenses WHERE car_id=? AND km IS NOT NULL AND km > 0
     GROUP BY month ORDER BY month ASC`,
  ).all(carId) as { month: string; km: number }[];
  if (rows.length === 0) return [];

  const out: { month: string; km: number }[] = [];
  const now = new Date();
  let previousReading: number | null = null;
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const upTo = rows.filter((r) => r.month <= ym);
    const reading = upTo.length ? upTo[upTo.length - 1].km : null;
    const hasOwnReading = rows.some((r) => r.month === ym);
    const km =
      hasOwnReading && previousReading != null && reading != null && reading > previousReading
        ? reading - previousReading
        : 0;
    out.push({ month: ym, km });
    if (reading != null) previousReading = reading;
  }
  return out;
}

function ymOffset(monthsBack: number, day: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsBack);
  d.setDate(day);
  return d.toISOString().slice(0, 10);
}

console.log("\n=== getMonthlyKm: puntero vs recorrido completo ===");
{
  // Varios escenarios, incluidos los que suelen romper este tipo de bucles.
  const escenarios: [string, { monthsBack: number; day: number; km: number }[]][] = [
    ["sin lecturas", []],
    ["una sola lectura", [{ monthsBack: 3, day: 10, km: 100000 }]],
    ["meses consecutivos", [
      { monthsBack: 5, day: 5, km: 100000 },
      { monthsBack: 4, day: 5, km: 101000 },
      { monthsBack: 3, day: 5, km: 102500 },
      { monthsBack: 2, day: 5, km: 104000 },
      { monthsBack: 1, day: 5, km: 105000 },
      { monthsBack: 0, day: 1, km: 106000 },
    ]],
    ["con huecos de meses", [
      { monthsBack: 5, day: 5, km: 200000 },
      { monthsBack: 2, day: 5, km: 205000 },
      { monthsBack: 0, day: 1, km: 206000 },
    ]],
    ["varias lecturas el mismo mes", [
      { monthsBack: 2, day: 3, km: 300000 },
      { monthsBack: 2, day: 15, km: 300800 },
      { monthsBack: 2, day: 27, km: 301500 },
      { monthsBack: 1, day: 4, km: 302000 },
    ]],
    ["cuentakilómetros hacia atrás (dato malo)", [
      { monthsBack: 3, day: 5, km: 400000 },
      { monthsBack: 2, day: 5, km: 390000 },
      { monthsBack: 1, day: 5, km: 401000 },
    ]],
    ["lecturas más antiguas que la ventana", [
      { monthsBack: 20, day: 5, km: 50000 },
      { monthsBack: 14, day: 5, km: 60000 },
      { monthsBack: 1, day: 5, km: 70000 },
    ]],
  ];

  for (const [nombre, lecturas] of escenarios) {
    const car = createCar({ marca: "Test", modelo: nombre.slice(0, 20) });
    for (const l of lecturas) {
      createExpense(car.id, "Carburante", 50, ymOffset(l.monthsBack, l.day), "x", "", 40, l.km, null);
    }
    for (const months of [3, 6, 12]) {
      const actual = JSON.stringify(getMonthlyKm(car.id, months));
      const esperado = JSON.stringify(monthlyKmReference(car.id, months));
      expect(`${nombre} (${months}m): mismo resultado`, actual === esperado,
        `\n        nuevo:    ${actual}\n        original: ${esperado}`);
    }
  }
}

console.log("\n=== getMaintenanceHistory: una consulta en vez de N ===");
{
  const car = createCar({ marca: "Honda", modelo: "Civic" });

  // Tres cambios de aceite completados, dos con gasto asociado.
  const hechos: number[] = [];
  for (const [i, km] of [100000, 110000, 120000].entries()) {
    const t = createMaintenanceTask(car.id, "Aceite y filtro", {
      preset_key: "engine_oil_filter",
      current_km: km,
      current_date: `2024-0${i + 1}-15`,
    });
    updateMaintenanceTask(t.id, { completed: 1 });
    hechos.push(t.id);
  }
  createExpense(car.id, "Mantenimiento (Taller)", 85.5, "2024-01-15", "Aceite", "", null, 100000, null,
    { maintenanceTaskId: hechos[0], tipoId: "mantenimiento", scheduleNext: false });
  createExpense(car.id, "Mantenimiento (Taller)", 92.0, "2024-03-15", "Aceite", "", null, 120000, null,
    { maintenanceTaskId: hechos[2], tipoId: "mantenimiento", scheduleNext: false });

  const hist = getMaintenanceHistory(car.id, { presetKey: "engine_oil_filter", partName: "Aceite y filtro" });

  expect("devuelve los tres mantenimientos", hist.length === 3, `(${hist.length})`);
  expect("ordenados del más reciente al más antiguo",
    hist[0].date === "2024-03-15" && hist[2].date === "2024-01-15",
    `(${hist.map((h) => h.date).join(", ")})`);
  expect("el que tuvo gasto trae su importe",
    hist.find((h) => h.date === "2024-01-15")?.importe === 85.5,
    `(${JSON.stringify(hist.map((h) => [h.date, h.importe]))})`);
  expect("el que no tuvo gasto trae null",
    hist.find((h) => h.date === "2024-02-15")?.importe === null);
  expect("los km se conservan", hist.every((h) => typeof h.km === "number"));

  // La rama por part_name (tareas antiguas sin preset_key) da lo mismo.
  const porNombre = getMaintenanceHistory(car.id, { presetKey: null, partName: "Aceite y filtro" });
  expect("buscar por part_name devuelve lo mismo",
    JSON.stringify(porNombre) === JSON.stringify(hist));

  // Dos gastos apuntando a la misma tarea no pueden duplicar filas: es el
  // motivo de usar subconsulta y no un LEFT JOIN.
  createExpense(car.id, "Mantenimiento (Taller)", 10, "2024-01-16", "Extra", "", null, null, null,
    { maintenanceTaskId: hechos[0], tipoId: "mantenimiento", scheduleNext: false });
  expect("un segundo gasto sobre la misma tarea no duplica filas",
    getMaintenanceHistory(car.id, { presetKey: "engine_oil_filter", partName: "Aceite y filtro" }).length === 3);
}

console.log("\n=== Tope de filas por consulta ===");
{
  const car = createCar({ marca: "Seat", modelo: "Ibiza" });
  for (let i = 0; i < 20; i++) {
    createExpense(car.id, "Otros", 10, "2026-01-10", `Gasto ${i}`);
  }

  expect("un limit disparatado se topa, no revienta",
    getExpenses(car.id, 999_999_999).length === 20);
  expect("el tope es el declarado", MAX_EXPENSES_LIMIT === 10000);
  expect("un limit normal se respeta", getExpenses(car.id, 5).length === 5);
  expect("un limit negativo cae al valor por defecto", getExpenses(car.id, -1).length === 20);
  expect("un limit NaN cae al valor por defecto", getExpenses(car.id, NaN).length === 20);
  expect("la exportación (9999) sigue cabiendo", getExpenses(car.id, 9999).length === 20);

  expect("el timeline también está topado",
    getTimeline(car.id, 999_999_999).length === 20);
  expect("y su offset no acepta basura",
    getTimeline(car.id, 5, -3).length === 5);
}

console.log(`\nRefactors de consulta: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
