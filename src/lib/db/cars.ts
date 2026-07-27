import { getDb } from "./core";

export interface Car {
  id: number; marca: string; modelo: string; generacion: string;
  motor: string; ano: number | null; puertas: number; km_actuales: number;
  estado: string; fecha_ultima_itv: string | null; mantenimiento_config: string | null;
  fecha_vencimiento_seguro: string | null;
  matricula: string; bastidor: string; combustible: string;
  foto_attachment_id: number | null; archivado: number;
  notes: string; created_at: string;
  /** Fecha de matriculación del vehículo (cuando se dio de alta en Tráfico).
   *  Null si el usuario todavía no la ha rellenado. Usada por getKmStats
   *  para calcular la media mensual cuando km_origen = 'matriculacion'. */
  fecha_matriculacion: string | null;
  /** Origen del cálculo de la media mensual de km.
   *  'matriculacion' → desde la fecha de matriculación (default).
   *  'primer_registro' → desde el primer gasto/mantenimiento con km. */
  km_origen: "matriculacion" | "primer_registro";
  /** Fecha del último pago del impuesto de circulación (IVTM). Se
   *  actualiza automáticamente al guardar un gasto de tipo "Impuestos".
   *  La alerta se dispara si la fecha es < hace 1 año. */
  fecha_impuesto_circulacion: string | null;
  /** Fecha del último pago del IVTM, editable directamente en el form de
   *  crear/editar coche. Los plazos municipales varían (1 mayo-30 jun en
   *  la mayoría; algunos ayuntamientos reparten por matrículas, otros
   *  anual). El usuario rellena esta fecha; metrics.ts alerta si >365 días. */
  fecha_ivtm: string | null;
  /** Caballos fiscales (potencia administrativa del coche). */
  potencia_cv: number | null;
  /** Cilindrada del motor en cc. */
  cilindrada_cc: number | null;
  /** Peso en orden de marcha (kg), tara + conductor aprox. */
  peso_kg: number | null;
  /** Número de plazas del vehículo. */
  plazas: number | null;
  /** Color del coche. */
  color: string | null;
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
  fecha_matriculacion?: string | null;
  km_origen?: "matriculacion" | "primer_registro";
  fecha_impuesto_circulacion?: string | null;
  fecha_ivtm?: string | null;
  potencia_cv?: number | null;
  cilindrada_cc?: number | null;
  peso_kg?: number | null;
  plazas?: number | null;
  color?: string | null;
}

export function createCar(input: CreateCarInput): Car {
  const r = getDb().prepare(`INSERT INTO cars
    (marca, modelo, generacion, motor, ano, puertas, km_actuales, matricula, bastidor, combustible, foto_attachment_id, fecha_matriculacion, km_origen, fecha_impuesto_circulacion, fecha_ivtm, potencia_cv, cilindrada_cc, peso_kg, plazas, color, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
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
      input.fecha_matriculacion ?? null,
      input.km_origen ?? "matriculacion",
      input.fecha_impuesto_circulacion ?? null,
      input.fecha_ivtm ?? null,
      input.potencia_cv ?? null,
      input.cilindrada_cc ?? null,
      input.peso_kg ?? null,
      input.plazas ?? null,
      input.color ?? null,
      "",  // notes (lo escribe el usuario desde /api/notes; default vacío)
    );
  return getCar(r.lastInsertRowid as number)!;
}

export function updateCar(id: number, fields: Record<string, any>): Car | undefined {
  // estado is computed and never editable from the API.
  const allowed = [
    "marca","modelo","generacion","motor","ano","puertas","km_actuales",
    "fecha_ultima_itv","fecha_vencimiento_seguro","mantenimiento_config","notes",
    "matricula","bastidor","combustible","foto_attachment_id","archivado",
    "fecha_matriculacion","km_origen",
    "fecha_impuesto_circulacion","fecha_ivtm",
    "potencia_cv","cilindrada_cc","peso_kg","plazas","color",
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
  // audit:A-5 — Una sola query con subconsulta correlacionada en vez de N+1.
  const where = opts.includeArchived ? "" : "WHERE c.archivado = 0";
  const ym = new Date().toISOString().slice(0, 7);
  return getDb().prepare(`
    SELECT c.*, COALESCE(
      (SELECT SUM(importe) FROM expenses WHERE car_id = c.id AND strftime('%Y-%m', date) = ?), 0
    ) as gastoMensual
    FROM cars c ${where}
    ORDER BY c.marca, c.modelo
  `).all(ym) as (Car & { gastoMensual: number })[];
}

/** Estadísticas de kilometraje de un coche: km totales, km este mes, y
 *  media de km/mes. El cálculo de la media depende de `car.km_origen`:
 *    - 'matriculacion': meses desde `car.fecha_matriculacion`. Si está
 *      vacía, devuelve null (no se inventa).
 *    - 'primer_registro': meses desde el primer gasto con km conocido.
 *      Si no hay gastos con km, también devuelve null. */
export interface KmStats {
  total: number;
  thisMonth: number | null;
  avgPerMonth: number | null;
  /** Media anual (km/año). Se calcula igual que la media mensual pero
   *  con años en lugar de meses. null si no hay base para contar. */
  avgPerYear: number | null;
  /** Meses usados en el cálculo (puede ser null si no hay base para contar). */
  months: number | null;
  /** Etiqueta legible del origen del cálculo, para mostrar en UI. */
  source: "matriculacion" | "primer_registro" | "sin_datos";
  /** Texto legible de la fecha desde la que se cuenta. null si no aplica. */
  sourceLabel: string | null;
}
export function getKmStats(carId: number): KmStats {
  const car = getCar(carId);
  const total = car?.km_actuales ?? 0;
  const origen: "matriculacion" | "primer_registro" = car?.km_origen ?? "matriculacion";

  // Recoge los gastos con km no nulo, ordenados por fecha.
  type Row = { date: string; km: number };
  const rows = getDb()
    .prepare("SELECT date, km FROM expenses WHERE car_id=? AND km IS NOT NULL AND km > 0 ORDER BY date ASC, id ASC")
    .all(carId) as Row[];

  // Km este mes: diferencia entre el último km y el último km anterior
  // al primer día de este mes. Si sólo hay 1 gasto este mes, se toma
  // (current - prev) usando el último gasto del mes anterior.
  const ym = new Date().toISOString().slice(0, 7);
  const monthStart = `${ym}-01`;
  const inMonth = rows.filter(r => r.date >= monthStart);
  const beforeMonth = rows.filter(r => r.date < monthStart);
  let thisMonth: number | null = null;
  if (inMonth.length > 0 && beforeMonth.length > 0) {
    const lastIn = inMonth[inMonth.length - 1].km;
    const lastBefore = beforeMonth[beforeMonth.length - 1].km;
    if (lastIn > lastBefore) thisMonth = lastIn - lastBefore;
  } else if (inMonth.length > 0 && total > 0 && beforeMonth.length === 0) {
    const firstIn = inMonth[0].km;
    if (total > firstIn) thisMonth = total - firstIn;
  }

  // Media mensual: depende del origen elegido.
  let avgPerMonth: number | null = null;
  let avgPerYear: number | null = null;
  let months: number | null = null;
  let sourceLabel: string | null = null;

  if (origen === "matriculacion") {
    const fm = car?.fecha_matriculacion || null;
    if (fm && total > 0) {
      const start = new Date(fm + "T12:00:00");
      const now = new Date();
      months = Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1);
      const years = Math.max(0.5, months / 12);
      avgPerMonth = Math.round(total / months);
      avgPerYear = Math.round(total / years);
      sourceLabel = `desde ${fm}`;
    }
  } else {
    if (rows.length > 0 && total > 0) {
      const first = new Date(rows[0].date + "T12:00:00");
      const now = new Date();
      months = Math.max(1, (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth()) + 1);
      const years = Math.max(0.5, months / 12);
      avgPerMonth = Math.round(total / months);
      avgPerYear = Math.round(total / years);
      sourceLabel = `desde ${rows[0].date}`;
    }
  }

  const source: "matriculacion" | "primer_registro" | "sin_datos" =
    avgPerMonth === null ? "sin_datos" : origen;

  return { total, thisMonth, avgPerMonth, avgPerYear, months, source, sourceLabel };
}
