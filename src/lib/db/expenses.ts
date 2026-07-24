import { getDb } from "./core";
import { bumpKmIfHigher } from "./cars";
import { completeMaintenanceTask } from "./maintenance";

export interface Expense {
  id: number; car_id: number; date: string; tipo: string;
  importe: number; descripcion: string; referencia: string;
  litros: number | null; km: number | null; coste_estimado_taller: number | null;
  maintenance_task_id: number | null;
  created_at: string;
}

/** Si el tipo de gasto es ITV o Seguro, actualiza automáticamente la fecha
 *  correspondiente del coche. Para Impuestos, sólo actualiza si el body
 *  trae `impuesto_circulacion: true` (checkbox marcado por el usuario).
 *  ITV y Seguros tienen cadencia anual; Impuestos también. La alerta
 *  correspondiente se borra en el siguiente load() al actualizarse. */
function autoUpdateCarDate(carId: number, tipo: string, date: string, fields: Record<string, any> = {}): void {
  const t = tipo.toLowerCase();
  if (t === "itv") {
    getDb().prepare("UPDATE cars SET fecha_ultima_itv = ? WHERE id = ?").run(date, carId);
  } else if (t === "seguro") {
    // El seguro entra como "vencimiento dentro de 1 año".
    const due = new Date(date + "T12:00:00");
    due.setFullYear(due.getFullYear() + 1);
    const dueStr = due.toISOString().slice(0, 10);
    getDb().prepare("UPDATE cars SET fecha_vencimiento_seguro = ? WHERE id = ?").run(dueStr, carId);
  } else if (t === "impuestos" && fields.impuesto_circulacion === true) {
    getDb().prepare("UPDATE cars SET fecha_impuesto_circulacion = ? WHERE id = ?").run(date, carId);
  }
}

export function getExpenses(carId: number, limit = 100): Expense[] {
  return getDb().prepare("SELECT * FROM expenses WHERE car_id=? ORDER BY date DESC, id DESC LIMIT ?").all(carId, limit) as Expense[];
}

export function getExpense(id: number): Expense | undefined {
  return getDb().prepare("SELECT * FROM expenses WHERE id=?").get(id) as Expense | undefined;
}

export function createExpense(
  carId: number, tipo: string, importe: number, date: string,
  descripcion = "", referencia = "",
  litros: number | null = null, km: number | null = null, costeTaller: number | null = null,
  opts: { impuestoCirculacion?: boolean; maintenanceTaskId?: number } = {},
): Expense {
  const r = getDb().prepare("INSERT INTO expenses (car_id, date, tipo, importe, descripcion, referencia, litros, km, coste_estimado_taller, maintenance_task_id) VALUES (?,?,?,?,?,?,?,?,?,?)").run(carId, date, tipo, importe, descripcion, referencia, litros, km, costeTaller, opts.maintenanceTaskId ?? null);
  // Ticket 1.14: bump car km if this expense has odometer data.
  if (km !== null && km > 0) bumpKmIfHigher(carId, km);
  // Ticket 1.20: ITV/Seguro/Impuestos actualizan la fecha del coche.
  autoUpdateCarDate(carId, tipo, date, { impuesto_circulacion: opts.impuestoCirculacion });
  // Ticket 1.16: si el usuario eligió una tarea de mantenimiento en el form
  // de gasto, la cerramos automáticamente con los datos del gasto (km + fecha)
  // y completeMaintenanceTask crea la siguiente tarea con next_km = km + interval_km.
  // Esto conecta el flujo de gastos con las tareas programadas.
  if (opts.maintenanceTaskId && (tipo === "Mantenimiento (Taller)" || tipo.startsWith("DIY"))) {
    completeMaintenanceTask(opts.maintenanceTaskId, km ?? 0, date);
  }
  return getDb().prepare("SELECT * FROM expenses WHERE id=?").get(r.lastInsertRowid) as Expense;
}

export function updateExpense(id: number, fields: Record<string, any>): Expense | undefined {
  const allowed = ["car_id","date","tipo","importe","descripcion","referencia","litros","km","coste_estimado_taller"];
  const sets: string[] = []; const vals: any[] = [];
  for (const k of allowed) { if (k in fields) { sets.push(`${k}=?`); vals.push(fields[k]); } }
  if (!sets.length) return getExpense(id);
  vals.push(id);
  getDb().prepare(`UPDATE expenses SET ${sets.join(",")} WHERE id=?`).run(...vals);
  // Ticket 1.14: bump car km if the update includes odometer data.
  if ("km" in fields && fields.km !== null && fields.km > 0) {
    const exp = getExpense(id);
    if (exp) bumpKmIfHigher(exp.car_id, fields.km);
  }
  // Ticket 1.20: si cambia el tipo o la fecha, y el nuevo tipo es ITV/
  // Seguro/Impuestos, actualizamos la fecha del coche.
  if (("tipo" in fields || "date" in fields)) {
    const exp = getExpense(id);
    if (exp) autoUpdateCarDate(exp.car_id, exp.tipo, exp.date, fields);
  }
  return getExpense(id);
}

export function deleteExpense(id: number): void {
  getDb().prepare("DELETE FROM expenses WHERE id=?").run(id);
}
