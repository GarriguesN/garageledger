// Verifica el flujo end-to-end del modal "Programar mantenimiento" (PUNTO 5).
//
// NOTA para futuros cambios: NINGÚN test debe dejar que un SqliteError
// sin capturar crashee el proceso. Usamos safeCall/unwrap para aislar
// los fallos y mostrarlos como ❌ en vez de cortar la ejecución.

import { createMaintenanceTask, getMaintenanceTasks, deleteMaintenanceTask } from "../src/lib/db";
import { sortMaintenanceTasks } from "../src/app/coches/[id]/components/MaintenanceSchedule";
import type { Car, MaintenanceTask } from "../src/app/coches/[id]/lib/types";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

/** Envuelve una operación de BD que puede lanzar SqliteError. Si falla,
 *  imprime el error como ❌ y devuelve undefined. */
function safeCall<T>(label: string, fn: () => T): T | undefined {
  try {
    return fn();
  } catch (err: any) {
    fail++;
    console.log(`  ❌ ${label}: ${err?.message || err}`);
    return undefined;
  }
}

const car = {
  id: 1, marca: "Honda", modelo: "Civic", ano: 2009,
  km_actuales: 100000, matricula: "1234-ABC", bastidor: "VINHONDACIVIC001",
} as unknown as Car;

console.log("\n=== Program Maintenance flow ===");

// Limpia las tareas de runs previos de esta suite.
safeCall("limpiar tareas previas (getMaintenanceTasks)", () => {
  const allTasks = getMaintenanceTasks(1, true);
  for (const t of allTasks) {
    if (t.part_name === "Pastillas traseras"
     || t.part_name === "Filtro de aire"
     || t.part_name === "Revisión anual") {
      safeCall(`deleteMaintenanceTask ${t.id}`, () => deleteMaintenanceTask(t.id));
    }
  }
});

const baseline = safeCall("baseline getMaintenanceTasks", () => getMaintenanceTasks(1));
let baselineSorted: MaintenanceTask[] = [];
if (baseline) {
  baselineSorted = safeCall("sortMaintenanceTasks baseline", () => sortMaintenanceTasks(baseline, car)) || [];
}

const newTask = safeCall("createMaintenanceTask", () =>
  createMaintenanceTask(1, "Pastillas traseras", {
    part_brand: "Brembo",
    current_km: 100000,
    next_km: 105000,
    next_date: null,
    interval_km: 15000,
    icon_key: "brake_pads",
  }),
);

if (newTask) {
  expect("createMaintenanceTask devuelve id", typeof newTask.id === "number");
  expect("createMaintenanceTask asigna part_name", newTask.part_name === "Pastillas traseras");
  expect("createMaintenanceTask asigna part_brand", newTask.part_brand === "Brembo");
  expect("createMaintenanceTask asigna current_km", newTask.current_km === 100000);
  expect("createMaintenanceTask asigna next_km", newTask.next_km === 105000);
  expect("createMaintenanceTask asigna interval_km", newTask.interval_km === 15000);
  expect("createMaintenanceTask acepta current_km explícito", newTask.current_km === 100000);
  expect("interval_km coherente con current_km + intervalo",
    (newTask.next_km ?? 0) - (newTask.current_km ?? 0) <= (newTask.interval_km ?? Infinity));

  const after = safeCall("getMaintenanceTasks after create", () => getMaintenanceTasks(1));
  if (after) {
    const found = after.find((t) => t.id === newTask.id);
    expect("Aparece en getMaintenanceTasks", !!found);

    const afterSorted = safeCall("sortMaintenanceTasks after", () => sortMaintenanceTasks(after, car)) || [];
    const top5 = afterSorted.slice(0, 5);
    const inTop5 = top5.some((t) => t.id === newTask.id);
    expect("Está entre las 5 primeras", inTop5 || after.length <= 5);

    if (afterSorted.length > 0) {
      expect("La tarea más urgente del estado final es Pastillas traseras",
        afterSorted[0]?.part_name === "Pastillas traseras");
      expect("Urgencia Pastillas (5000 km restantes) es la menor del set",
        afterSorted.length >= 2 ? (afterSorted[1].next_km ?? Infinity) >= 105000 : true);
    }
    expect("Hay al menos 1 tarea", afterSorted.length >= 1);
  }

  // Date-only task: verifies that tasks without next_km are ordered correctly.
  const dt = safeCall("createMaintenanceTask date-only", () =>
    createMaintenanceTask(1, "Revisión anual", {
      part_brand: "OEM",
      current_km: null,
      next_km: null,
      next_date: "2027-01-15",
      interval_km: null,
      icon_key: "calendar",
    }),
  );
  if (dt) {
    const dtAfter = safeCall("getMaintenanceTasks after date-only", () => getMaintenanceTasks(1));
    if (dtAfter) {
      const sorted = safeCall("sortMaintenanceTasks with date-only", () => sortMaintenanceTasks(dtAfter, car)) || [];
      const foundDt = sorted.find((t) => t.id === dt.id);
      expect("Tarea date-only entra en el orden", !!foundDt);
    }
    safeCall(`deleteMaintenanceTask date-only ${dt.id}`, () => deleteMaintenanceTask(dt.id));
  }
}

// Cleanup: restore state.
safeCall(`deleteMaintenanceTask newTask ${newTask?.id}`, () => {
  if (newTask?.id) deleteMaintenanceTask(newTask.id);
});

console.log(`\nProgram maintenance: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
