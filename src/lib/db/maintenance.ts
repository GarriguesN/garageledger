import { getDb } from "./core";
import { getCar, bumpKmIfHigher } from "./cars";

// Legacy concept-based config (keep for backward compat)
export const DEFAULT_MANTENIMIENTO = [
  { id: "aceite", label: "Aceite y filtro", km: 15000, meses: 12 },
  { id: "correa", label: "Correa distribucion", km: 100000, meses: 120 },
  { id: "frenos", label: "Pastillas de freno", km: 30000, meses: null },
  { id: "neumaticos", label: "Neumaticos", km: 40000, meses: 60 },
  { id: "filtro_aire", label: "Filtro de aire", km: 30000, meses: 24 },
  { id: "filtro_combustible", label: "Filtro combustible", km: 40000, meses: 48 },
  { id: "bujias", label: "Bujias", km: 60000, meses: 48 },
  { id: "liquido_frenos", label: "Liquido de frenos", km: 40000, meses: 24 },
  { id: "refrigerante", label: "Refrigerante", km: 100000, meses: 60 },
  { id: "itv", label: "ITV", km: null, meses: null },
];

export function getMantenimientoConfig(carId: number): any[] {
  const car = getCar(carId);
  if (!car) return DEFAULT_MANTENIMIENTO;
  const saved = car.mantenimiento_config ? JSON.parse(car.mantenimiento_config) : null;
  if (!saved) return DEFAULT_MANTENIMIENTO;
  return DEFAULT_MANTENIMIENTO.map(d => ({ ...d, ...(saved[d.id] || {}) }));
}

export function saveMantenimientoConfig(carId: number, config: Record<string, any>): void {
  getDb().prepare("UPDATE cars SET mantenimiento_config=? WHERE id=?").run(JSON.stringify(config), carId);
}

// ===== New maintenance_tasks table (v2) =====

export interface MaintenanceTask {
  id: number; car_id: number; part_name: string; part_brand: string; part_model: string;
  current_km: number | null; current_date: string | null;
  next_km: number | null; next_date: string | null;
  interval_km: number | null; interval_months: number | null;
  icon_key: string | null;
  notes: string; completed: number; created_at: string;
}

export function getMaintenanceTasks(carId: number, includeCompleted = false): MaintenanceTask[] {
  const sql = includeCompleted
    ? "SELECT * FROM maintenance_tasks WHERE car_id=? ORDER BY next_km ASC"
    : "SELECT * FROM maintenance_tasks WHERE car_id=? AND completed=0 ORDER BY next_km ASC";
  return getDb().prepare(sql).all(carId) as MaintenanceTask[];
}

export function createMaintenanceTask(carId: number, part_name: string, opts: {
  part_brand?: string; part_model?: string; current_km?: number; current_date?: string;
  next_km?: number; next_date?: string; interval_km?: number; interval_months?: number;
  icon_key?: string; notes?: string;
} = {}): MaintenanceTask {
  const r = getDb().prepare(`
    INSERT INTO maintenance_tasks (car_id, part_name, part_brand, part_model, current_km, current_date, next_km, next_date, interval_km, interval_months, icon_key, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(carId, part_name, opts.part_brand || "", opts.part_model || "", opts.current_km || null, opts.current_date || null,
    opts.next_km || null, opts.next_date || null, opts.interval_km || null, opts.interval_months || null,
    opts.icon_key || null, opts.notes || "");
  return getDb().prepare("SELECT * FROM maintenance_tasks WHERE id=?").get(r.lastInsertRowid) as MaintenanceTask;
}

export function updateMaintenanceTask(id: number, fields: Record<string, any>): MaintenanceTask | undefined {
  const allowed = ["part_name","part_brand","part_model","current_km","current_date","next_km","next_date","interval_km","interval_months","notes","completed"];
  const sets: string[] = []; const vals: any[] = [];
  for (const k of allowed) { if (k in fields) { sets.push(`${k}=?`); vals.push(fields[k]); } }
  if (!sets.length) return getDb().prepare("SELECT * FROM maintenance_tasks WHERE id=?").get(id) as MaintenanceTask | undefined;
  vals.push(id);
  getDb().prepare(`UPDATE maintenance_tasks SET ${sets.join(",")} WHERE id=?`).run(...vals);
  return getDb().prepare("SELECT * FROM maintenance_tasks WHERE id=?").get(id) as MaintenanceTask | undefined;
}

export function completeMaintenanceTask(id: number, currentKm: number, currentDate: string): MaintenanceTask | undefined {
  const task = getDb().prepare("SELECT * FROM maintenance_tasks WHERE id=?").get(id) as MaintenanceTask | undefined;
  if (!task) return undefined;
  // Ticket 1.14: bump the car's odometer when completing a task.
  bumpKmIfHigher(task.car_id, currentKm);
  const nextKm = task.interval_km ? currentKm + task.interval_km : null;
  const nextDate = task.interval_months ? (() => {
    const d = new Date(currentDate + "T12:00:00");
    d.setMonth(d.getMonth() + task.interval_months);
    return d.toISOString().slice(0, 10);
  })() : null;
  // audit:M-6 — Envolver UPDATE + INSERT en transacción para atomicidad.
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("UPDATE maintenance_tasks SET completed=1, current_km=?, current_date=?, next_km=?, next_date=? WHERE id=?").run(currentKm, currentDate, nextKm, nextDate, id);
    const r = db.prepare(`
      INSERT INTO maintenance_tasks (car_id, part_name, part_brand, part_model, current_km, current_date, next_km, next_date, interval_km, interval_months, notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(task.car_id, task.part_name, task.part_brand, task.part_model, currentKm, currentDate, nextKm, nextDate, task.interval_km, task.interval_months, task.notes);
    return r.lastInsertRowid as number;
  });
  const newId = tx();
  return getDb().prepare("SELECT * FROM maintenance_tasks WHERE id=?").get(newId) as MaintenanceTask | undefined;
}

export function deleteMaintenanceTask(id: number): void {
  getDb().prepare("DELETE FROM maintenance_tasks WHERE id=?").run(id);
}
