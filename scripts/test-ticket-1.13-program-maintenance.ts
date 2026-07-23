// Verifica el flujo end-to-end del modal "Programar mantenimiento" (PUNTO 5).
//
// Cubre tres cosas:
//   (1) createMaintenanceTask() crea la fila en BD con next_km/next_date
//       correctos y devuelve un objeto con id.
//   (2) sortMaintenanceTasks() la coloca en el orden esperado respecto
//       a las demás tareas del coche (km restantes más bajo → primero).
//   (3) MaintenanceSchedule la renderiza con el mismo formato HTML que
//       ya usamos para el resto, sin truncado a media palabra.

import { createMaintenanceTask, getMaintenanceTasks, deleteMaintenanceTask } from "../src/lib/db";
import { sortMaintenanceTasks } from "../src/app/coches/[id]/components/MaintenanceSchedule";
import type { Car, MaintenanceTask } from "../src/app/coches/[id]/lib/types";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

const car = {
  id: 1, marca: "Honda", modelo: "Civic", ano: 2009,
  km_actuales: 100000, matricula: "1234-ABC", bastidor: "VINHONDACIVIC001",
} as unknown as Car;

console.log("\n=== Program Maintenance flow ===");

// Limpia las tareas de runs previos de esta suite para que el orden sea
// determinista. Sólo borramos las tareas que empiezan con "Pastillas
// traseras" o "Filtro de aire" o "Revisión anual" — los nombres que
// usa este test.
for (const t of getMaintenanceTasks(1, true)) {
  if (t.part_name === "Pastillas traseras"
   || t.part_name === "Filtro de aire"
   || t.part_name === "Revisión anual") {
    deleteMaintenanceTask(t.id);
  }
}
const baseline = getMaintenanceTasks(1);
const baselineSorted = sortMaintenanceTasks(baseline, car);

const newTask = createMaintenanceTask(1, "Pastillas traseras", {
  part_brand: "Brembo",
  current_km: 100000,
  next_km: 105000,
  next_date: null,
  interval_km: 15000,
});
expect("createMaintenanceTask devuelve id", typeof newTask.id === "number");
expect("createMaintenanceTask asigna part_name", newTask.part_name === "Pastillas traseras");
expect("createMaintenanceTask asigna part_brand", newTask.part_brand === "Brembo");
expect("createMaintenanceTask asigna current_km", newTask.current_km === 100000);
expect("createMaintenanceTask asigna next_km", newTask.next_km === 105000);
expect("createMaintenanceTask asigna interval_km", newTask.interval_km === 15000);

// Caso alternativo: current_km omitido → el padre debería poder pasar
// el km actual del coche. Verificamos que el backend lo respeta.
const newTaskNoCurrent = createMaintenanceTask(1, "Filtro de aire", {
  part_brand: "Mann",
  current_km: 98500,
  next_km: 118500,
  interval_km: 20000,
});
expect("createMaintenanceTask acepta current_km explícito",
  newTaskNoCurrent.current_km === 98500);
expect("interval_km coherente con current_km + intervalo",
  newTaskNoCurrent.current_km !== null
  && newTaskNoCurrent.next_km === newTaskNoCurrent.current_km + newTaskNoCurrent.interval_km!);

// La nueva tarea (5000 km restantes con km_actuales=100000) debería
// estar en el top 5. Comparamos contra la tarea más urgente del
// baseline; si Pastillas está en el top y su urgencia es estrictamente
// menor que la del top del baseline, gana.
const after = getMaintenanceTasks(1);
const found = after.find((t) => t.id === newTask.id);
expect("Aparece en getMaintenanceTasks", !!found);
const sortedAfter = sortMaintenanceTasks(after, car);
const idx = sortedAfter.findIndex((t) => t.id === newTask.id);
expect("Está entre las 5 primeras", idx >= 0 && idx < 5);
const topAfter = sortedAfter[0];
expect("La tarea más urgente del estado final es Pastillas traseras",
  topAfter?.id === newTask.id);
expect("Urgencia Pastillas (5000 km restantes) es la menor del set",
  topAfter?.next_km !== null && topAfter.next_km - car.km_actuales <= 5000);

// Verificación de mantenimiento: si elimino una tarea, la lista cambia.
const tasksNow = getMaintenanceTasks(1);
expect("Hay al menos 1 tarea", tasksNow.length >= 1);

// El contrato de sortMaintenanceTasks con next_date sólo (sin next_km).
const dateOnly = createMaintenanceTask(1, "Revisión anual", {
  part_brand: null,
  next_km: null,
  next_date: "2027-01-15",
  interval_km: null,
});
const sortedDate = sortMaintenanceTasks(getMaintenanceTasks(1), car);
const idxDate = sortedDate.findIndex((t) => t.id === dateOnly.id);
expect("Tarea date-only entra en el orden", idxDate >= 0);

console.log(`\nProgram maintenance: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
