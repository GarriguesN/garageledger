// Verifica el contrato del catálogo de mantenimientos predefinidos
// (Ticket 1.15): MAINTENANCE_PRESETS, groupPresetsByCategory,
// findPresetByKey y getIconForKey.

import {
  MAINTENANCE_PRESETS, groupPresetsByCategory, findPresetByKey, getIconForKey,
} from "../src/lib/maintenance/presets";
import { createMaintenanceTask, getMaintenanceTasks, deleteMaintenanceTask } from "../src/lib/db";
import type { Car, MaintenanceTask } from "../src/app/coches/[id]/lib/types";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

console.log("\n=== Presets: catálogo ===");

expect("Catálogo no vacío", MAINTENANCE_PRESETS.length > 0);
expect("Hay >=30 presets (lista completa)", MAINTENANCE_PRESETS.length >= 30);

// Cada preset tiene los campos requeridos.
const broken = MAINTENANCE_PRESETS.find((p) => !p.key || !p.category || !p.part_name || !p.icon_key);
expect("Ningún preset roto (sin key/category/part_name/icon_key)", broken === undefined);

// Keys únicas.
const keys = new Set<string>();
let duplicateKey: string | undefined;
for (const p of MAINTENANCE_PRESETS) {
  if (keys.has(p.key)) { duplicateKey = p.key; break; }
  keys.add(p.key);
}
expect("Todas las keys son únicas", duplicateKey === undefined);

// Categorías conocidas.
const expectedCategories = [
  "Motor y Lubricación",
  "Sistema de Frenado",
  "Transmisión y Dirección",
  "Suspensión, Ruedas y Rodaje",
  "Sistema Eléctrico y Climatización",
  "Carrocería, Visibilidad y Otros",
];
const realCategories = new Set(MAINTENANCE_PRESETS.map((p) => p.category));
for (const cat of expectedCategories) {
  expect(`Categoría presente: ${cat}`, realCategories.has(cat));
}

console.log("\n=== Presets: groupPresetsByCategory ===");
const groups = groupPresetsByCategory();
expect("Hay >=6 grupos", groups.length >= 6);
expect("Cada grupo tiene al menos 1 preset", groups.every((g) => g.presets.length >= 1));
const motorGroup = groups.find((g) => g.category === "Motor y Lubricación");
expect("Motor y Lubricación tiene >=10 presets", (motorGroup?.presets.length ?? 0) >= 10);

console.log("\n=== Presets: findPresetByKey ===");
const aceite = findPresetByKey("engine_oil_filter");
expect("engine_oil_filter existe", !!aceite);
expect("Aceite tiene interval_km 10000", aceite?.interval_km === 10000);
expect("Aceite tiene icon_key engine_oil", aceite?.icon_key === "engine_oil");
const noExiste = findPresetByKey("xyz_no_existe");
expect("findPresetByKey devuelve undefined para key desconocida", noExiste === undefined);

console.log("\n=== Presets: getIconForKey ===");
const IconAceite = getIconForKey("engine_oil");
expect("engine_oil devuelve un componente Lucide", typeof IconAceite === "object" || typeof IconAceite === "function");
const IconWrench = getIconForKey("wrench");
expect("wrench devuelve un componente Lucide", typeof IconWrench === "object" || typeof IconWrench === "function");
const IconFallback = getIconForKey(null);
expect("null → fallback Wrench", typeof IconFallback === "object" || typeof IconFallback === "function");

console.log("\n=== Presets: end-to-end con BD ===");

/** Wrapper helper para evitar crash del proceso por SqliteError. */
function safeCall<T>(label: string, fn: () => T): T | undefined {
  try { return fn(); }
  catch (err: any) { fail++; console.log(`  ❌ ${label}: ${err?.message || err}`); return undefined; }
}

// Limpia tareas previas de esta suite.
safeCall("limpiar tareas previas", () => {
  for (const t of getMaintenanceTasks(1, true)) {
    if (t.part_name === "Aceite de motor y filtro"
     || t.part_name === "Filtro de aire del motor"
     || t.part_name === "Bujías") {
      deleteMaintenanceTask(t.id);
    }
  }
});

const preset = findPresetByKey("engine_oil_filter")!;
const created = safeCall("createMaintenanceTask con preset", () =>
  createMaintenanceTask(1, preset.part_name, {
    part_brand: "Castrol",
    current_km: 100000,
    next_km: 110000,
    interval_km: preset.interval_km,
    interval_months: preset.interval_months,
    icon_key: preset.icon_key,
  }),
);

if (created) {
  expect("Tarea creada con icon_key del preset", created.icon_key === "engine_oil");
  expect("Tarea creada con interval_km del preset", created.interval_km === 10000);
  expect("Tarea creada con interval_months del preset", created.interval_months === 12);
  expect("Tarea creada con part_name del preset", created.part_name === "Aceite de motor y filtro");

  const after = safeCall("getMaintenanceTasks after preset create", () => getMaintenanceTasks(1));
  if (after) {
    const found = after.find((t) => t.id === created.id);
    expect("Tarea aparece en getMaintenanceTasks", !!found);
    expect("Tarea recuperada preserva icon_key", found?.icon_key === "engine_oil");
  }

  safeCall(`deleteMaintenanceTask ${created.id}`, () => deleteMaintenanceTask(created.id));
}

console.log(`\nMaintenance presets: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
