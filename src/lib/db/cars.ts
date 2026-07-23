import { getDb } from "./core";

export interface Car {
  id: number; marca: string; modelo: string; generacion: string;
  motor: string; ano: number | null; puertas: number; km_actuales: number;
  estado: string; fecha_ultima_itv: string | null; mantenimiento_config: string | null;
  fecha_vencimiento_seguro: string | null;
  matricula: string; bastidor: string; combustible: string;
  foto_attachment_id: number | null; archivado: number;
  notes: string; created_at: string;
}

export function getCars(includeArchived = false): Car[] {
  const where = includeArchived ? "" : " WHERE archivado = 0";
  return getDb().prepare(`SELECT * FROM cars${where} ORDER BY marca, modelo`).all() as Car[];
}

export function getCar(id: number): Car | undefined {
  return getDb().prepare("SELECT * FROM cars WHERE id = ?").get(id) as Car | undefined;
}

export interface CreateCarInput {
  marca: string;
  modelo: string;
  generacion?: string;
  motor?: string;
  ano?: number | null;
  puertas?: number;
  km?: number;
  matricula?: string;
  bastidor?: string;
  combustible?: string;
  foto_attachment_id?: number | null;
}

export function createCar(input: CreateCarInput): Car {
  const r = getDb().prepare(`INSERT INTO cars
    (marca, modelo, generacion, motor, ano, puertas, km_actuales, matricula, bastidor, combustible, foto_attachment_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
      input.marca,
      input.modelo,
      input.generacion || "",
      input.motor || "",
      input.ano ?? null,
      input.puertas ?? 5,
      input.km ?? 0,
      input.matricula || "",
      input.bastidor || "",
      input.combustible || "Gasolina",
      input.foto_attachment_id ?? null,
    );
  return getCar(r.lastInsertRowid as number)!;
}

export function updateCar(id: number, fields: Record<string, any>): Car | undefined {
  // estado is computed and never editable from the API.
  const allowed = [
    "marca","modelo","generacion","motor","ano","puertas","km_actuales",
    "fecha_ultima_itv","fecha_vencimiento_seguro","mantenimiento_config","notes",
    "matricula","bastidor","combustible","foto_attachment_id","archivado",
  ];
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

/** Bump the car's km_actuales to `km` ONLY if `km` is higher than the
 *  current value. Never lowers the odometer. Returns the updated Car or
 *  undefined if the car doesn't exist. Idempotent: called from expense
 *  creation/update, maintenance completion, and car editing. */
export function bumpKmIfHigher(carId: number, km: number): Car | undefined {
  if (!Number.isFinite(km) || km <= 0) return undefined;
  const car = getCar(carId);
  if (!car) return undefined;
  if (km <= car.km_actuales) return car;
  getDb().prepare("UPDATE cars SET km_actuales = ? WHERE id = ?").run(km, carId);
  return getCar(carId);
}

export function getCarDashboardData(opts: { includeArchived?: boolean } = {}) {
  const cars = getCars(opts.includeArchived);
  const ym = new Date().toISOString().slice(0, 7);
  return cars.map(car => {
    const row = getDb().prepare("SELECT COALESCE(SUM(importe),0) as gasto FROM expenses WHERE car_id=? AND strftime('%Y-%m', date)=?").get(car.id, ym) as any;
    return { ...car, gastoMensual: row.gasto };
  });
}
