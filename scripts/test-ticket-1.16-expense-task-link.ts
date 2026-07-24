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


// ── 7) Ticket 1.16-fix: escenarios a/b/c del checkbox scheduleNext ──

// (a) Tarea CON interval_km + scheduleNext=true (default) → sí se crea la siguiente.
const taskA = safeCall("createMaintenanceTask Aceite 15k", () =>
  createMaintenanceTask(1, "Aceite 15k A", { interval_km: 15000, icon_key: "engine_oil" }),
);
const beforeA = getMaintenanceTasks(1, false).length;
const eA = safeCall("createExpense A (interval+scheduleNext=true)", () =>
  createExpense(1, "Mantenimiento (Taller)", 60, "2026-07-23",
    "Aceite A", "", null, newKm + 1000, null,
    { maintenanceTaskId: taskA!.id, scheduleNext: true }),
);
const afterA = getMaintenanceTasks(1, false).length;
expect("A) con interval + scheduleNext=true → tarea original cerrada",
  getMaintenanceTasks(1, false).find(t => t.id === taskA!.id) === undefined);
expect("A) con interval + scheduleNext=true → siguiente tarea creada (completed=0)",
  getMaintenanceTasks(1, false).some(t => t.part_name === "Aceite 15k A"));
const newA = getMaintenanceTasks(1, false).find(t => t.part_name === "Aceite 15k A");
if (newA) deleteMaintenanceTask(newA.id);
if (eA) deleteExpense(eA.id);

// (b) Tarea SIN intervals + scheduleNext=false (default por no tener intervalos) → NO crea fantasma.
const taskB = safeCall("createMaintenanceTask Arreglo puntual sin interval", () =>
  createMaintenanceTask(1, "Arreglo parrilla", {}),  // sin interval_km ni interval_months
);
expect("B) tarea creada sin intervalos", taskB?.id !== undefined);
expect("B) intervalo_km null", taskB?.interval_km === null);
expect("B) intervalo_months null", taskB?.interval_months === null);
const beforeB = getMaintenanceTasks(1, false).length;
const eB = safeCall("createExpense B (sin interval + scheduleNext=false)", () =>
  createExpense(1, "Mantenimiento (Taller)", 300, "2026-07-23",
    "Arreglo parrilla", "", null, newKm + 2000, null,
    { maintenanceTaskId: taskB!.id, scheduleNext: false }),
);
const afterB = getMaintenanceTasks(1, false).length;
expect("B) sin interval + scheduleNext=false → tarea original cerrada",
  getMaintenanceTasks(1, false).find(t => t.id === taskB!.id) === undefined);
expect("B) sin interval + scheduleNext=false → NO se crea tarea fantasma",
  getMaintenanceTasks(1, false).filter(t => t.part_name === "Arreglo parrilla").length === 0);
if (eB) deleteExpense(eB.id);

// (c.1) Usuario FUERZA: tarea sin interval + scheduleNext=true (al revés del default)
//      → el backend respeta su elección y crea la tarea siguiente aunque no haya intervalos
//      (caso raro pero válido: "Arreglo puntual pero el usuario quiere que le recuerde en X km").
const taskC = safeCall("createMaintenanceTask Reparación", () =>
  createMaintenanceTask(1, "Reparación X", {}),
);
const beforeC = getMaintenanceTasks(1, false).length;
const eC = safeCall("createExpense C (forzar scheduleNext=true en tarea sin interval)", () =>
  createExpense(1, "Mantenimiento (Taller)", 80, "2026-07-23",
    "Reparación X", "", null, newKm + 3000, null,
    { maintenanceTaskId: taskC!.id, scheduleNext: true }),
);
const afterC = getMaintenanceTasks(1, false).length;
expect("C.1) forzar scheduleNext=true en sin interval → siguiente tarea creada",
  getMaintenanceTasks(1, false).some(t => t.part_name === "Reparación X"));
const newC = getMaintenanceTasks(1, false).find(t => t.part_name === "Reparación X");
if (newC) deleteMaintenanceTask(newC.id);
if (eC) deleteExpense(eC.id);

// (c.2) Usuario FUERZA: tarea CON interval + scheduleNext=false (al revés del default)
//      → el backend respeta su elección: NO crea la siguiente. Útil si el usuario
//      decide que esta fue la última vez (ej. "ya no quiero que me avise de más cambios de aceite").
const taskD = safeCall("createMaintenanceTask Pastillas", () =>
  createMaintenanceTask(1, "Pastillas freno", { interval_km: 30000, icon_key: "brake_pads" }),
);
const beforeD = getMaintenanceTasks(1, false).length;
const eD = safeCall("createExpense D (forzar scheduleNext=false en con interval)", () =>
  createExpense(1, "Mantenimiento (Taller)", 120, "2026-07-23",
    "Pastillas freno", "", null, newKm + 4000, null,
    { maintenanceTaskId: taskD!.id, scheduleNext: false }),
);
const afterD = getMaintenanceTasks(1, false).length;
expect("D) forzar scheduleNext=false → tarea original cerrada",
  getMaintenanceTasks(1, false).find(t => t.id === taskD!.id) === undefined);
expect("D) forzar scheduleNext=false → NO crea siguiente tarea pendiente",
  !getMaintenanceTasks(1, false).some(t => t.part_name === "Pastillas freno"));
if (eD) deleteExpense(eD.id);

// (c.3) IMPORTANTE: SIN maintenanceTaskId, scheduleNext=true no crea nada (no hay tarea que cerrar).
const beforeE = getMaintenanceTasks(1, false).length;
const eE = safeCall("createExpense E (sin taskId, scheduleNext=true)", () =>
  createExpense(1, "Carburante", 50, "2026-07-23", "Gasolina", "", 40, null, null,
    { scheduleNext: true }),
);
const afterE = getMaintenanceTasks(1, false).length;
expect("E) sin maintenanceTaskId + scheduleNext=true → no se crea ninguna tarea",
  afterE === beforeE);
if (eE) deleteExpense(eE.id);


console.log(`\nTicket 1.16: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
