import { getDb } from "./core";

export interface Car {
  id: number; marca: string; modelo: string; generacion: string;
  motor: string; ano: number | null; puertas: number; km_actuales: number;
  estado: string; fecha_ultima_itv: string | null; mantenimiento_config: string | null;
  fecha_vencimiento_seguro: string | null;
  notes: string; created_at: string;
}

export function getCars(): Car[] {
  return getDb().prepare("SELECT * FROM cars ORDER BY marca, modelo").all() as Car[];
}

export function getCar(id: number): Car | undefined {
  return getDb().prepare("SELECT * FROM cars WHERE id = ?").get(id) as Car | undefined;
}

export function createCar(marca: string, modelo: string, generacion = "", motor = "", ano: number | null = null, puertas = 5, km = 0): Car {
  const r = getDb().prepare("INSERT INTO cars (marca, modelo, generacion, motor, ano, puertas, km_actuales) VALUES (?,?,?,?,?,?,?)").run(marca, modelo, generacion, motor, ano, puertas, km);
  return getCar(r.lastInsertRowid as number)!;
}

export function updateCar(id: number, fields: Record<string, any>): Car | undefined {
  // Never allow direct estado update - it's computed
  const allowed = ["marca","modelo","generacion","motor","ano","puertas","km_actuales","fecha_ultima_itv","fecha_vencimiento_seguro","mantenimiento_config","notes"];
  const sets: string[] = []; const vals: any[] = [];
  for (const k of allowed) { if (k in fields) { sets.push(`${k}=?`); vals.push(fields[k]); } }
  if (!sets.length) return getCar(id);
  vals.push(id);
  getDb().prepare(`UPDATE cars SET ${sets.join(",")} WHERE id=?`).run(...vals);
  return getCar(id);
}

export function deleteCar(id: number): void {
  getDb().prepare("DELETE FROM cars WHERE id=?").run(id);
}

export function getCarDashboardData() {
  const cars = getCars();
  const ym = new Date().toISOString().slice(0, 7);
  return cars.map(car => {
    const row = getDb().prepare("SELECT COALESCE(SUM(importe),0) as gasto FROM expenses WHERE car_id=? AND strftime('%Y-%m', date)=?").get(car.id, ym) as any;
    return { ...car, gastoMensual: row.gasto };
  });
}
