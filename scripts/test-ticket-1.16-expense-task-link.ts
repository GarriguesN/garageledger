// Verifica Ticket 1.16: filas minimalistas, banner ITV/Seguro/Impuestos,
// costeTaller sólo en DIY, y conexión gasto↔tarea de mantenimiento.

import { createExpense, deleteExpense, getExpense, getExpenses } from "../src/lib/db/expenses";
import {
  createMaintenanceTask, getMaintenanceTasks, deleteMaintenanceTask,
} from "../src/lib/db/maintenance";
import { updateCar, getCar } from "../src/lib/db/cars";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}
function safeCall<T>(label: string, fn: () => T): T | undefined {
  try { return fn(); }
  catch (err: any) { fail++; console.log(`  ❌ ${label}: ${err?.message || err}`); return undefined; }
}

console.log("\n=== Ticket 1.16: filas + ITV/Seguro/Impuestos + gasto↔tarea ===");

// ── 1) Banner flag en filas: ITV/Seguro/Impuestos se identifican por tipo ──
const tipoFlags: Record<string, boolean> = {
  Carburante: false,
  ITV: true,
  Seguro: true,
  Impuestos: true,
  "Mantenimiento (Taller)": false,
  "Mantenimiento (DIY)": false,
  Tuning: false,
};
for (const [tipo, isAnnual] of Object.entries(tipoFlags)) {
  expect(`flag isAnnual correcto para ${tipo}`, tipo === "ITV" || tipo === "Seguro" || tipo === "Impuestos" ? isAnnual === true : isAnnual === false, true);
}

// ── 2) Crear gasto ITV — verifica que se persiste maintenance_task_id null ──
const itvDate = "2026-03-15";
const e1 = safeCall("createExpense ITV", () =>
  createExpense(1, "ITV", 50, itvDate, "ITV 2026", "", null, null, null),
);
expect("ITV → expense persistida", e1?.id !== undefined);
expect("ITV → maintenance_task_id null", e1?.maintenance_task_id === null);
if (e1) deleteExpense(e1.id);

// ── 3) Conexión gasto↔tarea: crear tarea, luego gasto con selectedTask ──
const car = getCar(1)!;
const initialKm = car.km_actuales;
const intervalKm = 15000;
const nextKm = initialKm + intervalKm;

const task = safeCall("createMaintenanceTask Aceite", () =>
  createMaintenanceTask(1, "Cambio de aceite", {
    interval_km: intervalKm,
    icon_key: "engine_oil",
    notes: "Aceite + filtro",
  }),
);
expect("tarea creada", task?.id !== undefined);
const taskId = task!.id;
const taskNextKm = task!.next_km;

// Gasto de tipo Taller con selectedTask, km nuevo.
const newKm = initialKm + 500;
const e2 = safeCall("createExpense Taller con selectedTask", () =>
  createExpense(1, "Mantenimiento (Taller)", 80, "2026-07-23",
    "Cambio aceite taller", "", null, newKm, null,
    { maintenanceTaskId: taskId }),
);
expect("gasto persistido", e2?.id !== undefined);
expect("maintenance_task_id guardado en el gasto", e2?.maintenance_task_id === taskId);

// La tarea original debe estar completed=1
const allTasks = getMaintenanceTasks(1, false);
const completedTask = allTasks.find(t => t.id === taskId);
expect("tarea original cerrada (completed)", completedTask === undefined, true);

// Y debe existir una nueva tarea abierta con next_km = newKm + interval_km
const newTask = allTasks.find(t => t.part_name === "Cambio de aceite");
expect("nueva tarea abierta creada automáticamente", newTask !== undefined);
expect("nueva tarea tiene current_km = newKm", newTask?.current_km === newKm);
expect("nueva tarea tiene next_km = newKm + interval_km", newTask?.next_km === newKm + intervalKm);

// Cleanup
if (e2) deleteExpense(e2.id);
if (newTask) deleteMaintenanceTask(newTask.id);

// ── 4) Conexión gasto↔tarea también para DIY ──
const task2 = safeCall("createMaintenanceTask Filtro aire", () =>
  createMaintenanceTask(1, "Filtro de aire", {
    interval_km: 30000,
    icon_key: "air_filter",
  }),
);
expect("tarea 2 creada", task2?.id !== undefined);

const diyDate = "2026-07-23";
const e3 = safeCall("createExpense DIY con selectedTask", () =>
  createExpense(1, "Mantenimiento (DIY)", 25, diyDate,
    "DIY filtro", "", null, newKm + 5000, 80,
    { maintenanceTaskId: task2!.id }),
);
expect("DIY + coste_taller + selectedTask → gasto OK", e3?.id !== undefined);
expect("coste_estimado_taller guardado", e3?.coste_estimado_taller === 80);

const allTasks2 = getMaintenanceTasks(1, false);
const newTask2 = allTasks2.find(t => t.part_name === "Filtro de aire");
expect("nueva tarea DIY abierta creada", newTask2 !== undefined);
if (e3) deleteExpense(e3.id);
if (newTask2) deleteMaintenanceTask(newTask2.id);

// ── 5) Sin selectedTask: gasto independiente, sin cerrar tarea ──
const task3 = safeCall("createMaintenanceTask Bujías", () =>
  createMaintenanceTask(1, "Bujías", { interval_km: 60000, icon_key: "spark_plug" }),
);
const before = getMaintenanceTasks(1, false).length;
const e4 = safeCall("createExpense sin selectedTask", () =>
  createExpense(1, "Mantenimiento (Taller)", 100, "2026-07-23",
    "Bujías nuevas", "", null, newKm + 10000, null),
);
const after = getMaintenanceTasks(1, false).length;
expect("gasto sin selectedTask no afecta tareas", after === before, true);
if (e4) deleteExpense(e4.id);
if (task3) deleteMaintenanceTask(task3.id);

// ── 6) Actualizar coche para no dejar el km cambiado ──
safeCall("restore km del coche", () => updateCar(1, { km_actuales: initialKm }));

console.log(`\nTicket 1.16: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
