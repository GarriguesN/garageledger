// El orden de la lista de mantenimientos: primero lo que más urge.
//
// La garantía es la de siempre; con el rebuild cambió dónde vive. Antes
// ordenaba sortMaintenanceTasks() dentro de MaintenanceSchedule.tsx; ahora lo
// hace sortByUrgency() sobre vistas ya calculadas, que es lo que consumen las
// pantallas 2 (próximo mantenimiento) y 7 (lista completa).

import { toMaintenanceView, sortByUrgency } from "../src/lib/ui/maintenance";
import type { MaintenanceTask } from "../src/lib/db/maintenance";

let fail = 0;
function expect(label: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ✅ ${label}`);
  else { fail++; console.log(`  ❌ ${label} ${extra}`); }
}

const CURRENT_KM = 100000;

const task = (
  id: number,
  name: string,
  next_km: number | null,
  next_date: string | null,
): MaintenanceTask => ({
  id, car_id: 1, part_name: name, part_brand: "", part_model: "",
  current_km: 90000, current_date: "2026-01-01",
  next_km, next_date, interval_km: 10000, interval_months: 12,
  notes: "", icon_key: null, preset_key: null, completed: 0,
  created_at: "2026-01-01",
});

const order = (tasks: MaintenanceTask[]) =>
  sortByUrgency(tasks.map((t) => toMaintenanceView(t, CURRENT_KM))).map((v) => v.title);

console.log("\n=== 1) Entre tareas al día, primero la más cercana en km ===");
const byDistance = order([
  task(3, "Lejana", 130000, null),
  task(1, "Más cercana", 100500, null),
  task(2, "Intermedia", 101000, null),
]);
console.log("   orden:", byDistance);
expect("cercana → intermedia → lejana",
  JSON.stringify(byDistance) === JSON.stringify(["Más cercana", "Intermedia", "Lejana"]),
  `(salió ${JSON.stringify(byDistance)})`);

console.log("\n=== 2) Lo vencido va por delante de lo que solo está próximo ===");
// 99.000 km de plazo con el coche en 100.000 → pasada de vueltas.
const withOverdue = order([
  task(1, "Próxima", 100500, null),
  task(2, "Vencida", 99000, null),
]);
console.log("   orden:", withOverdue);
expect("la vencida sale primero",
  withOverdue[0] === "Vencida", `(salió ${JSON.stringify(withOverdue)})`);

console.log("\n=== 3) Una tarea sin plazo no adelanta a las que sí lo tienen ===");
const withUndated = order([
  task(1, "Sin plazo", null, null),
  task(2, "Con plazo", 105000, null),
]);
console.log("   orden:", withUndated);
expect("la que tiene plazo va antes",
  withUndated[0] === "Con plazo", `(salió ${JSON.stringify(withUndated)})`);

console.log(fail === 0 ? "\n✅ Orden por urgencia correcto" : `\n❌ ${fail} fallo(s)`);
if (fail) process.exit(1);
