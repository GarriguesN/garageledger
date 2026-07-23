import { sortMaintenanceTasks } from "../src/app/coches/[id]/components/MaintenanceSchedule";
import type { Car, MaintenanceTask } from "../src/app/coches/[id]/lib/types";

const car = { id: 1, km_actuales: 100000 } as Car;
const task = (id: number, name: string, next_km: number | null, next_date: string | null): MaintenanceTask => ({
  id, car_id: 1, part_name: name, part_brand: "", part_model: "", current_km: 90000,
  current_date: "2026-01-01", next_km, next_date, interval_km: 10000, interval_months: 12,
  notes: "", completed: 0,
});
const result = sortMaintenanceTasks([
  task(1, "Más cercana", 100500, null),
  task(2, "Intermedia", 101000, null),
  task(3, "Lejana", 130000, null),
], car);
const names = result.map((t) => t.part_name);
console.log("Maintenance ordering:", names);
if (JSON.stringify(names) !== JSON.stringify(["Más cercana", "Intermedia", "Lejana"])) {
  console.error("❌ ordering does not prioritize nearest maintenance");
  process.exit(1);
}
console.log("✅ three-task ordering passes");
