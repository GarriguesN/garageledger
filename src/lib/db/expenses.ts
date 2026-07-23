import { getDb } from "./core";
import { bumpKmIfHigher } from "./cars";

export interface Expense {
  id: number; car_id: number; date: string; tipo: string;
  importe: number; descripcion: string; referencia: string;
  litros: number | null; km: number | null; coste_estimado_taller: number | null; created_at: string;
}

export function getExpenses(carId: number, limit = 100): Expense[] {
  return getDb().prepare("SELECT * FROM expenses WHERE car_id=? ORDER BY date DESC, id DESC LIMIT ?").all(carId, limit) as Expense[];
}

export function getExpense(id: number): Expense | undefined {
  return getDb().prepare("SELECT * FROM expenses WHERE id=?").get(id) as Expense | undefined;
}

export function createExpense(carId: number, tipo: string, importe: number, date: string, descripcion = "", referencia = "", litros: number | null = null, km: number | null = null, costeTaller: number | null = null): Expense {
  const r = getDb().prepare("INSERT INTO expenses (car_id, date, tipo, importe, descripcion, referencia, litros, km, coste_estimado_taller) VALUES (?,?,?,?,?,?,?,?,?)").run(carId, date, tipo, importe, descripcion, referencia, litros, km, costeTaller);
  // Ticket 1.14: bump car km if this expense has odometer data.
  if (km !== null && km > 0) bumpKmIfHigher(carId, km);
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
  return getExpense(id);
}

export function deleteExpense(id: number): void {
  getDb().prepare("DELETE FROM expenses WHERE id=?").run(id);
}
