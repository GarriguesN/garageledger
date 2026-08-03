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
  // audit:B-4 — `mantenimiento_config` es una columna TEXT con JSON dentro, y
  // hasta aquí se parseaba a pelo. Cualquier cosa que no fuera JSON válido
  // —una edición a mano de la BD, una escritura a medias— lanzaba desde una
  // función de lectura. Con un valor corrupto, lo razonable es caer a la
  // configuración por defecto: peor es tumbar la pantalla.
  const saved = safeParseConfig(car.mantenimiento_config);
  if (!saved) return DEFAULT_MANTENIMIENTO;
  return DEFAULT_MANTENIMIENTO.map(d => ({ ...d, ...(saved[d.id] || {}) }));
}

function safeParseConfig(raw: string | null): Record<string, any> | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  // Un JSON válido puede ser `null`, `42` o `[1,2]`, y ninguno sirve como
  // mapa de configuración: el `saved[d.id]` de abajo daría resultados raros
  // en vez de un error claro.
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return parsed as Record<string, any>;
}

export function saveMantenimientoConfig(carId: number, config: Record<string, any>): void {
  getDb().prepare("UPDATE cars SET mantenimiento_config=? WHERE id=?").run(JSON.stringify(config), carId);
}

// ===== New maintenance_tasks table (v2) =====

export interface MaintenanceTask {
  id: number; car_id: number; part_name: string; part_brand: string; part_model: string;
  current_km: number | null; current_date: string | null;
  next_km: number | null; next_date: string | null;
  interval_km: number | null; interval_months: number | null; notes: string;
  icon_key: string | null;
  /** Ticket 1.17: clave estable del preset seleccionado. Permite comparar
   *  gasto↔tarea por id semántico en vez de por texto de part_name. */
  preset_key: string | null;
  /** Cuántos días antes de `next_date` avisar. null = ventana por defecto
   *  (la fija metrics.ts). Lo elige el paso "Próximo mantenimiento". */
  reminder_days: number | null;
  completed: number; created_at: string;
}

export function getMaintenanceTasks(carId: number, includeCompleted = false): MaintenanceTask[] {
  const sql = includeCompleted
    ? "SELECT * FROM maintenance_tasks WHERE car_id=? ORDER BY next_km ASC"
    : "SELECT * FROM maintenance_tasks WHERE car_id=? AND completed=0 ORDER BY next_km ASC";
  return getDb().prepare(sql).all(carId) as MaintenanceTask[];
}

/** Ticket 1.17: tareas abiertas con un preset_key concreto. Lo usa el
 *  frontend para detectar si existe una tarea pendiente que el gasto
 *  debería cerrar (o reemplazar). Devuelve array vacío si no hay. */
export function getOpenMaintenanceTasksByPreset(carId: number, presetKey: string): MaintenanceTask[] {
  return getDb().prepare(
    "SELECT * FROM maintenance_tasks WHERE car_id=? AND preset_key=? AND completed=0 ORDER BY next_km ASC",
  ).all(carId, presetKey) as MaintenanceTask[];
}

/** Busca tareas abiertas por nombre de pieza (fallback cuando no hay
 *  preset_key en las tareas antiguas). Usa LIKE para ser tolerante
 *  a variaciones (ej. "Aceite y filtro" vs "Aceite de motor y filtro"). */
export function getOpenMaintenanceTasksByName(carId: number, partName: string): MaintenanceTask[] {
  // 1) Búsqueda exacta (la mayoría de casos)
  const exact = getDb().prepare(
    "SELECT * FROM maintenance_tasks WHERE car_id=? AND part_name=? AND completed=0 ORDER BY next_km ASC",
  ).all(carId, partName) as MaintenanceTask[];
  if (exact.length > 0) return exact;
  // 2) Fuzzy: extraemos palabras clave (≥4 chars) y buscamos con OR.
  //    Ordenamos por score (más palabras coincidentes = más arriba) y luego
  //    por next_km. Esto evita que "Cambio de aceite y filtro" se matchee
  //    con "Filtro de habitáculo" porque ambos contienen "filtro".
  const words = partName.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 4);
  if (words.length === 0) return [];
  // Calcular score por tarea: número de palabras coincidentes
  const allTasks = getDb().prepare(
    "SELECT * FROM maintenance_tasks WHERE car_id=? AND completed=0 ORDER BY next_km ASC",
  ).all(carId) as MaintenanceTask[];
  const scored = allTasks
    .map((t) => {
      const tname = t.part_name.toLowerCase();
      const matched = words.filter((w) => tname.includes(w)).length;
      return { task: t, score: matched };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.task.next_km! - b.task.next_km!);
  return scored.map((x) => x.task);
}
export function createMaintenanceTask(carId: number, part_name: string, opts: {
  part_brand?: string; part_model?: string;
  current_km?: number; current_date?: string;
  next_km?: number; next_date?: string; interval_km?: number; interval_months?: number;
  icon_key?: string; notes?: string;
  /** Ticket 1.17: clave del preset elegido. Si viene, el caller espera
   *  que `part_name` sea el `MaintenancePreset.part_name` del catálogo. */
  preset_key?: string;
  reminder_days?: number | null;
} = {}): MaintenanceTask {
  const r = getDb().prepare(`
    INSERT INTO maintenance_tasks (car_id, part_name, part_brand, part_model, current_km, current_date, next_km, next_date, interval_km, interval_months, icon_key, notes, preset_key, reminder_days)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(carId, part_name, opts.part_brand || "", opts.part_model || "", opts.current_km || null, opts.current_date || null,
    opts.next_km || null, opts.next_date || null, opts.interval_km || null, opts.interval_months || null,
    opts.icon_key || null, opts.notes || "", opts.preset_key || null, opts.reminder_days ?? null);
  return getDb().prepare("SELECT * FROM maintenance_tasks WHERE id=?").get(r.lastInsertRowid) as MaintenanceTask;
}

export function updateMaintenanceTask(id: number, fields: Record<string, any>): MaintenanceTask | undefined {
  const allowed = ["part_name","part_brand","part_model","current_km","current_date","next_km","next_date","interval_km","interval_months","notes","completed","preset_key","icon_key","reminder_days"];
  const sets: string[] = []; const vals: any[] = [];
  for (const k of allowed) {
    // audit:B-10 — `null` es un valor, no una ausencia. Filtrarlo junto con
    // `undefined` hacía imposible VACIAR un campo: quitarle la fecha a una
    // tarea o desactivar su recordatorio se ignoraba en silencio y la API
    // devolvía la tarea sin cambios, como si hubiera funcionado.
    //
    // `undefined` sí se sigue ignorando, que es lo que significa "este campo
    // no viene en la petición" cuando el cuerpo llega de JSON.parse.
    if (k in fields && fields[k] !== undefined) {
      sets.push(`${k}=?`); vals.push(fields[k]);
    }
  }
  if (!sets.length) return getDb().prepare("SELECT * FROM maintenance_tasks WHERE id=?").get(id) as MaintenanceTask | undefined;
  vals.push(id);
  getDb().prepare(`UPDATE maintenance_tasks SET ${sets.join(",")} WHERE id=?`).run(...vals);
  return getDb().prepare("SELECT * FROM maintenance_tasks WHERE id=?").get(id) as MaintenanceTask | undefined;
}

export function completeMaintenanceTask(
  id: number, currentKm: number, currentDate: string,
  scheduleNext: boolean = true,
): MaintenanceTask | undefined {
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
  // Ticket 1.16-fix: la creación de la siguiente tarea SOLO se ejecuta si
  // `scheduleNext` es true. Si es false, sólo cerramos la tarea actual y
  // salimos sin crear tarea fantasma (ni siquiera cuando interval_km e
  // interval_months son null). Las tareas puntuales como "Arreglo
  // parrilla frontal" sin intervalos ya no quedan colgadas en la lista
  // para siempre.
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("UPDATE maintenance_tasks SET completed=1, current_km=?, current_date=? WHERE id=?").run(currentKm, currentDate, id);
    if (!scheduleNext) return null;
    const r = db.prepare(`
      INSERT INTO maintenance_tasks (car_id, part_name, part_brand, part_model, current_km, current_date, next_km, next_date, interval_km, interval_months, notes, preset_key, icon_key, reminder_days)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(task.car_id, task.part_name, task.part_brand, task.part_model, currentKm, currentDate, nextKm, nextDate, task.interval_km, task.interval_months, task.notes, task.preset_key, task.icon_key, task.reminder_days);
    return r.lastInsertRowid as number;
  });
  const newId = tx();
  if (newId == null) return undefined;  // scheduleNext=false → no se creó la siguiente
  return getDb().prepare("SELECT * FROM maintenance_tasks WHERE id=?").get(newId) as MaintenanceTask | undefined;
}

export function deleteMaintenanceTask(id: number): void {
  getDb().prepare("DELETE FROM maintenance_tasks WHERE id=?").run(id);
}

/** Historial de una tarea recurrente: todas las veces que se ha hecho esa
 *  misma pieza en este coche, de la más reciente a la más antigua, con el
 *  importe del gasto asociado si lo hubo.
 *
 *  Se agrupa por `preset_key` cuando existe (identificador estable del
 *  catálogo) y por `part_name` cuando no, que es el caso de las tareas
 *  escritas a mano. Así "Aceite de motor y filtro" y "Aceite y filtro"
 *  siguen contando como la misma pieza si comparten preset. */
export function getMaintenanceHistory(
  carId: number,
  opts: { presetKey?: string | null; partName: string },
): { id: number; date: string | null; km: number | null; importe: number | null }[] {
  const db = getDb();
  // El importe (el gasto que cerró cada tarea, si el usuario lo registró) se
  // resuelve en la misma consulta con una subconsulta correlacionada, en vez
  // de con una consulta por fila. Un LEFT JOIN sería lo natural, pero
  // duplicaría filas si dos gastos apuntaran a la misma tarea; la subconsulta
  // conserva el `LIMIT 1` que había y por tanto el resultado exacto de antes.
  const select = `
    SELECT t.id, t.current_date as date, t.current_km as km,
           (SELECT e.importe FROM expenses e WHERE e.maintenance_task_id = t.id LIMIT 1) as importe
    FROM maintenance_tasks t
    WHERE t.car_id=? AND t.completed=1 AND`;
  const order = "ORDER BY t.current_date DESC, t.id DESC";

  return (opts.presetKey
    ? db.prepare(`${select} t.preset_key=? ${order}`).all(carId, opts.presetKey)
    : db.prepare(`${select} t.part_name=? ${order}`).all(carId, opts.partName)
  ) as { id: number; date: string | null; km: number | null; importe: number | null }[];
}

/** Una tarea por id, sin filtrar por completada. */
export function getMaintenanceTask(id: number): MaintenanceTask | undefined {
  return getDb().prepare("SELECT * FROM maintenance_tasks WHERE id=?").get(id) as MaintenanceTask | undefined;
}
