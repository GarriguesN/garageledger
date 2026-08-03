import { getDb } from "./core";
import { getCar } from "./cars";
import { DOCUMENT_TYPE_MAP, type DocumentTypeId } from "@/lib/documents/catalog";
import { formatDate as esDate, formatDeadline } from "@/lib/format";
import { carExpiries, itvDueDate, taxDueDate, type ExpiryCar } from "@/lib/domain/expiry";

export function getMonthlySpend(carId: number): { current: number; previous: number } {
  const now = new Date();
  const ym = now.toISOString().slice(0, 7);
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  const row = getDb().prepare(`
    SELECT COALESCE(SUM(CASE WHEN strftime('%Y-%m', date)=? THEN importe ELSE 0 END),0) as current,
           COALESCE(SUM(CASE WHEN strftime('%Y-%m', date)=? THEN importe ELSE 0 END),0) as previous
    FROM expenses WHERE car_id=?
  `).get(ym, prev, carId) as any;
  return row;
}

export function getDiySavings(carId: number): number {
  // Ticket 1.23: usamos tipo_id en vez de tipo (label) cuando está disponible.
  const row = getDb().prepare(
    "SELECT COALESCE(SUM(coste_estimado_taller-importe),0) as savings FROM expenses " +
    "WHERE car_id=? AND (tipo_id='mantenimiento_diy' OR (tipo_id IS NULL AND tipo='Mantenimiento (DIY)')) AND coste_estimado_taller IS NOT NULL"
  ).get(carId) as any;
  return row.savings;
}

export function getFuelConsumption(carId: number): { l100km: number | null; costPerKm: number | null; pricePerLiter: number | null } {
  const refuels = getDb().prepare(
    "SELECT date, importe, litros, km FROM expenses " +
    "WHERE car_id=? AND (tipo_id='carburante' OR (tipo_id IS NULL AND tipo='Carburante')) AND km IS NOT NULL AND litros IS NOT NULL ORDER BY date ASC"
  ).all(carId) as any[];
  if (refuels.length < 2) return { l100km: null, costPerKm: null, pricePerLiter: null };
  const first = refuels[0], last = refuels[refuels.length - 1];
  const diffKm = last.km - first.km;
  const totalLitros = refuels.slice(0, -1).reduce((s: number, r: any) => s + r.litros, 0);
  const totalImporte = refuels.reduce((s: number, r: any) => s + r.importe, 0);
  const l100km = diffKm > 0 ? (totalLitros / diffKm) * 100 : null;
  const costPerKm = diffKm > 0 ? totalImporte / diffKm : null;
  const ppL = last.litros > 0 ? last.importe / last.litros : null;
  return {
    l100km: l100km !== null ? Math.round(l100km * 100) / 100 : null,
    costPerKm: costPerKm !== null ? Math.round(costPerKm * 10000) / 10000 : null,
    pricePerLiter: ppL !== null ? Math.round(ppL * 1000) / 1000 : null,
  };
}

export function getTotalCostPerKm(carId: number): number | null {
  const row = getDb().prepare("SELECT COALESCE(SUM(importe),0) as total FROM expenses WHERE car_id=?").get(carId) as any;
  const car = getCar(carId);
  if (!car || car.km_actuales <= 0 || row.total <= 0) return null;
  return Math.round((row.total / car.km_actuales) * 10000) / 10000;
}

/** Consumo reciente frente al de siempre (mockup 12: "↓ 0.7 vs media").
 *
 *  "Reciente" son los últimos repostajes —por defecto cuatro—, calculados
 *  igual que la media histórica: litros repostados entre los km recorridos
 *  en ese tramo. Devuelve null cuando no hay repostajes suficientes; una
 *  comparación con dos datos no es una tendencia, es ruido. */
export function getRecentFuelConsumption(carId: number, refuels = 4): number | null {
  const rows = getDb().prepare(
    "SELECT litros, km FROM expenses " +
    "WHERE car_id=? AND (tipo_id='carburante' OR (tipo_id IS NULL AND tipo='Carburante')) " +
    "AND km IS NOT NULL AND litros IS NOT NULL ORDER BY date DESC, id DESC LIMIT ?",
  ).all(carId, refuels) as { litros: number; km: number }[];
  if (rows.length < 2) return null;

  // Vienen de más reciente a más antiguo: el tramo va del último al primero.
  const newest = rows[0];
  const oldest = rows[rows.length - 1];
  const diffKm = newest.km - oldest.km;
  if (diffKm <= 0) return null;

  // El repostaje más antiguo del tramo llenó el depósito ANTES de recorrerlo,
  // así que sus litros no cuentan — igual que en la media histórica.
  const litros = rows.slice(0, -1).reduce((sum, r) => sum + r.litros, 0);
  if (litros <= 0) return null;
  return Math.round((litros / diffKm) * 100 * 100) / 100;
}

/** Coste por km de los últimos meses, para comparar con el de toda la vida
 *  del coche. Se mide sobre los km realmente recorridos en la ventana, no
 *  sobre el cuentakilómetros total. */
export function getRecentCostPerKm(carId: number, months = 3): number | null {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const from = since.toISOString().slice(0, 10);

  const row = getDb().prepare(
    "SELECT COALESCE(SUM(importe),0) as total, MIN(km) as minKm, MAX(km) as maxKm " +
    "FROM expenses WHERE car_id=? AND date >= ?",
  ).get(carId, from) as { total: number; minKm: number | null; maxKm: number | null };

  if (!row || row.total <= 0 || row.minKm == null || row.maxKm == null) return null;
  const km = row.maxKm - row.minKm;
  if (km <= 0) return null;
  return Math.round((row.total / km) * 10000) / 10000;
}

/** Consumo repostaje a repostaje, para la gráfica de evolución de Insights.
 *
 *  Cada punto es el consumo del tramo que cerró ese repostaje: los litros que
 *  entraron entre los kilómetros recorridos desde el anterior. Los tramos sin
 *  km o con el cuentakilómetros hacia atrás se descartan en vez de pintar un
 *  pico imposible. */
export function getFuelConsumptionHistory(
  carId: number,
  limit = 12,
): { date: string; l100km: number }[] {
  const refuels = getDb().prepare(
    "SELECT date, litros, km FROM expenses " +
    "WHERE car_id=? AND (tipo_id='carburante' OR (tipo_id IS NULL AND tipo='Carburante')) " +
    "AND km IS NOT NULL AND litros IS NOT NULL AND litros > 0 ORDER BY date ASC, id ASC",
  ).all(carId) as { date: string; litros: number; km: number }[];

  const points: { date: string; l100km: number }[] = [];
  for (let i = 1; i < refuels.length; i++) {
    const km = refuels[i].km - refuels[i - 1].km;
    if (km <= 0) continue;
    points.push({
      date: refuels[i].date,
      l100km: Math.round((refuels[i].litros / km) * 100 * 100) / 100,
    });
  }
  return points.slice(-limit);
}

/** Media de gasto mensual sobre los meses con actividad. Se ignoran los
 *  meses en blanco: dividir entre meses en los que el coche ni se usó
 *  rebajaría la media hasta volverla inútil. */
export function getAverageMonthlySpend(carId: number): number | null {
  const row = getDb().prepare(
    "SELECT COALESCE(SUM(importe),0) as total, COUNT(DISTINCT strftime('%Y-%m', date)) as months " +
    "FROM expenses WHERE car_id=?",
  ).get(carId) as { total: number; months: number };
  if (!row || row.months === 0 || row.total <= 0) return null;
  return Math.round((row.total / row.months) * 100) / 100;
}

/** Gasto total del vehículo, para la tarjeta "Total gastado". */
export function getTotalSpend(carId: number): number {
  const row = getDb()
    .prepare("SELECT COALESCE(SUM(importe),0) as total FROM expenses WHERE car_id=?")
    .get(carId) as { total: number };
  return row.total;
}

/** Gasto del año en curso — la cifra "Gasto total (este año)" del resumen.
 *  El total de siempre no dice nada en un coche de quince años; el del año
 *  sí es comparable con lo que uno tiene en la cabeza. */
export function getYearSpend(carId: number): number {
  const year = new Date().getFullYear();
  const row = getDb().prepare(
    "SELECT COALESCE(SUM(importe),0) as total FROM expenses WHERE car_id=? AND strftime('%Y', date)=?",
  ).get(carId, String(year)) as { total: number };
  return row.total;
}

/** Suma de los gastos de mantenimiento (taller y DIY). */
export function getMaintenanceSpend(carId: number): number {
  const row = getDb().prepare(
    "SELECT COALESCE(SUM(importe),0) as total FROM expenses WHERE car_id=? AND (" +
    "tipo_id IN ('mantenimiento','mantenimiento_diy') OR " +
    "(tipo_id IS NULL AND tipo LIKE 'Mantenimiento%'))",
  ).get(carId) as { total: number };
  return row.total;
}

// audit:B-2 — El cálculo de vencimientos vive ahora en `@/lib/domain/expiry`,
// escrito una sola vez. Estos dos nombres se conservan porque la pantalla de
// resumen y `lib/ui/events` los importan de aquí; delegan y ya está.
export function getItvDueDate(car: {
  fecha_ultima_itv: string | null;
  ano: number | null;
}): Date | null {
  return itvDueDate(car);
}

export function getTaxDueDate(car: {
  fecha_ivtm: string | null;
  fecha_impuesto_circulacion: string | null;
}): Date | null {
  return taxDueDate(car);
}

/** "en 15 días" / "hace 2 meses", para la segunda línea de un aviso. Se
 *  apoya en formatDeadline para que el aviso y el evento del mismo trámite
 *  no digan "hace 4 meses" y "hace 5 meses" por redondear distinto. */
function formatRelativeDays(due: Date): string {
  return formatDeadline(due.toISOString().slice(0, 10)) ?? "";
}

export function getCarMetrics(carId: number) {
  const monthly = getMonthlySpend(carId);
  const diy = getDiySavings(carId);
  const fuel = getFuelConsumption(carId);
  const totalCostPerKm = getTotalCostPerKm(carId);
  const projectedAnnual = monthly.current * 12;
  const car = getCar(carId);
  // `topic` dice de qué va cada aviso, para que la pantalla sepa a dónde
  // llevar al tocarlo (la tarea, las fechas del coche, los documentos) sin
  // tener que adivinarlo leyendo el mensaje.
  //
  // `title` y `detail` son el mismo aviso partido en dos líneas, que es como
  // lo pinta la tarjeta del resumen (título blanco + motivo en el color de la
  // severidad). `message` se mantiene intacto porque el panel de
  // notificaciones y /api/alerts lo consumen en una sola línea.
  const alerts: {
    type: 'critical' | 'warning' | 'info';
    message: string;
    title?: string;
    detail?: string;
    task_id?: number;
    topic?: 'maintenance' | 'itv' | 'insurance' | 'tax' | 'document';
  }[] = [];
  // audit:A-2 — No mutar la BD en un GET. El estado se computa en runtime.
  // Use refreshCarEstado(carId) after mutations to persist.
  const tasks = getDb().prepare("SELECT * FROM maintenance_tasks WHERE car_id=? AND completed=0").all(carId) as any[];

  if (car) {

    // Maintenance task alerts
    // Ticket 1.6: cada alerta de mantenimiento lleva `task_id` para que
    // el frontend pueda hacer scroll a la fila exacta en
    // MaintenanceSchedule. Sin este vínculo, dos tareas con el mismo
    // part_name (caso real: cambias filtros con marcas distintas) no se
    // podrían distinguir parseando solo el mensaje.
    for (const t of tasks) {
      if (t.next_km && t.next_km <= car.km_actuales) {
        alerts.push({
          type: 'critical',
          message: `${t.part_name}: taller necesario (${t.next_km.toLocaleString("es-ES")} km)`,
          title: t.part_name,
          detail: `Taller necesario · ${t.next_km.toLocaleString("es-ES")} km`,
          task_id: t.id,
          topic: 'maintenance',
        });
      } else if (t.next_km && (t.next_km - car.km_actuales) < (t.interval_km || 15000) * 0.15) {
        alerts.push({
          type: 'warning',
          message: `${t.part_name}: en ${(t.next_km - car.km_actuales).toLocaleString("es-ES")} km`,
          title: t.part_name,
          detail: `En ${(t.next_km - car.km_actuales).toLocaleString("es-ES")} km`,
          task_id: t.id,
          topic: 'maintenance',
        });
      } else if (t.next_date && t.reminder_days) {
        // Aviso por fecha: solo para tareas donde el usuario pidió
        // explícitamente un recordatorio (paso "Próximo mantenimiento" del
        // asistente). Sin `reminder_days` la tarea se sigue avisando por km
        // como siempre, así que esto no cambia el comportamiento anterior.
        const daysLeft = Math.ceil(
          (new Date(t.next_date + "T12:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        if (daysLeft < 0) {
          alerts.push({
            type: 'critical',
            message: `${t.part_name}: vencido (${t.next_date})`,
            title: t.part_name,
            detail: `Vencido el ${esDate(t.next_date)}`,
            task_id: t.id,
            topic: 'maintenance',
          });
        } else if (daysLeft <= t.reminder_days) {
          alerts.push({
            type: 'warning',
            message: `${t.part_name}: en ${daysLeft} días`,
            title: t.part_name,
            detail: `En ${daysLeft} días`,
            task_id: t.id,
            topic: 'maintenance',
          });
        }
      }
    }

    // Documentos con caducidad y recordatorio activo. El usuario marca el
    // aviso al subirlos (paso 3 del asistente de documentos); sin ese aviso
    // no se genera alerta, para no llenar el panel con cada PDF que se sube.
    const docs = getDb().prepare(
      "SELECT original_name, document_type, valid_until, reminder_months FROM attachments " +
      "WHERE car_id=? AND valid_until IS NOT NULL AND reminder_months IS NOT NULL",
    ).all(carId) as { original_name: string; document_type: string | null; valid_until: string; reminder_months: number }[];
    for (const d of docs) {
      const name = d.document_type
        ? DOCUMENT_TYPE_MAP[d.document_type as DocumentTypeId]?.label ?? d.original_name
        : d.original_name;
      const daysLeft = Math.ceil(
        (new Date(d.valid_until + "T12:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      if (daysLeft < 0) {
        alerts.push({
          type: 'critical',
          message: `${name}: caducado (${d.valid_until})`,
          title: name,
          detail: `Caducado el ${esDate(d.valid_until)}`,
          topic: 'document',
        });
      } else if (daysLeft <= d.reminder_months * 30) {
        alerts.push({
          type: 'warning',
          message: `${name}: caduca en ${daysLeft} días (${d.valid_until})`,
          title: name,
          detail: `Caduca en ${daysLeft} días`,
          topic: 'document',
        });
      }
    }

    // audit:B-2 — Las tres caducidades salen del mismo cálculo que usan la
    // puntuación, el estado del coche y la lista de próximos eventos.
    const { itv, insurance, tax } = carExpiries(car);

    // ITV
    if (itv.state === "expired") {
      alerts.push({
        type: 'critical',
        message: `ITV caducada (${car.fecha_ultima_itv})`,
        title: `ITV caducada (${esDate(car.fecha_ultima_itv!)})`,
        detail: `Venció ${formatRelativeDays(itv.due!)}`,
        topic: 'itv',
      });
    } else if (itv.state === "soon") {
      alerts.push({
        type: 'warning',
        message: `ITV próxima: ${itv.due!.toLocaleDateString("es-ES")}`,
        title: `ITV (${esDate(itv.due!.toISOString().slice(0, 10))})`,
        detail: `Vence ${formatRelativeDays(itv.due!)}`,
        topic: 'itv',
      });
    }

    // Seguro
    if (insurance.state === "expired") {
      alerts.push({
        type: 'critical',
        message: `Seguro caducado (${car.fecha_vencimiento_seguro})`,
        title: 'Seguro del vehículo',
        detail: `Caducado el ${esDate(car.fecha_vencimiento_seguro!)}`,
        topic: 'insurance',
      });
    } else if (insurance.state === "soon") {
      alerts.push({
        type: 'warning',
        message: `Seguro vence en ${insurance.daysLeft} días (${car.fecha_vencimiento_seguro})`,
        title: 'Seguro del vehículo',
        detail: `Vence en ${insurance.daysLeft} días`,
        topic: 'insurance',
      });
    }

    // Impuesto de circulación (IVTM). Se apunta por dos vías —el checkbox del
    // IVTM en un gasto rellena `fecha_impuesto_circulacion`, y el formulario
    // del coche rellena `fecha_ivtm`—, y antes cada una generaba SU propia
    // alerta: un coche con las dos fechas mostraba el mismo trámite dos veces,
    // una como "Impuesto de circulación" y otra como "IVTM", con fechas
    // distintas si los dos apuntes no coincidían. `taxDueDate` se queda con el
    // pago más reciente, que es el que manda, y sale un solo aviso.
    if (tax.state === "expired") {
      alerts.push({
        type: 'critical',
        message: `Impuesto de circulación caducado (${car.fecha_ivtm || car.fecha_impuesto_circulacion})`,
        title: 'Impuesto de circulación',
        detail: `Venció ${formatRelativeDays(tax.due!)}`,
        topic: 'tax',
      });
    } else if (tax.state === "soon") {
      alerts.push({
        type: 'warning',
        message: `Impuesto de circulación próximo: ${tax.due!.toLocaleDateString("es-ES")}`,
        title: 'Impuesto de circulación',
        detail: `Vence ${formatRelativeDays(tax.due!)}`,
        topic: 'tax',
      });
    }
  }
  const estado = car ? computeCarEstado(car) : null;
  return { monthly, diy, fuel, totalCostPerKm, projectedAnnual, alerts, estado };
}

// `offset` existe para permitir paginar en el futuro (audit:B-4) sin romper
// a los llamadores actuales, que siempre piden desde el principio.
export function getTimeline(carId: number, limit = 50, offset = 0): any[] {
  return getDb().prepare("SELECT id, date, tipo, tipo_id, importe, descripcion, referencia, litros, km, coste_estimado_taller, maintenance_task_id, preset_key, 'expense' as entry_type FROM expenses WHERE car_id=? ORDER BY date DESC, id DESC LIMIT ? OFFSET ?").all(carId, limit, offset) as any[];
}

export function getMonthlyHistory(carId: number, months = 6): { month: string; total: number }[] {
  // audit:B-9 — Igual que en getScoreHistory: el modificador va como parámetro
  // en vez de concatenado. Es el mismo patrón, y era el otro sitio donde
  // aparecía.
  const window = `-${Math.max(1, Math.floor(months))} months`;
  return getDb().prepare(
    `SELECT strftime('%Y-%m', date) as month, SUM(importe) as total FROM expenses
     WHERE car_id=? AND date>=date('now', ?, 'start of month')
     GROUP BY month ORDER BY month ASC`,
  ).all(carId, window) as any[];
}

/** Estado resumido del coche, el que se pinta en la tarjeta del garaje.
 *
 *  audit:B-2 — Esta función miraba `daysUntil(fecha_ultima_itv)`, que son los
 *  días transcurridos desde la ÚLTIMA inspección, y llamaba "ITV Caducada" a
 *  todo lo que pasara de 30 días. Nunca aplicaba el intervalo. Un coche de
 *  2018 con la ITV pasada hace trece meses —en plazo, porque le toca cada dos
 *  años— aparecía como caducado en la ficha mientras la puntuación decía 100 y
 *  "Próximos eventos" daba una fecha futura. Tres respuestas para el mismo
 *  coche. Ahora las tres salen de `carExpiries`. */
export function computeCarEstado(car: any, tasks?: any[]): string {
  // Sin ITV apuntada no se puede afirmar nada: se pide revisar los datos.
  if (!car.fecha_ultima_itv) return "A revisar";

  const { itv, insurance } = carExpiries(car as ExpiryCar);

  if (itv.state === "expired") return "ITV Caducada";
  if (insurance.state === "expired") return "Seguro Caducado";

  const taskList = tasks ?? getDb().prepare("SELECT * FROM maintenance_tasks WHERE car_id=? AND completed=0").all(car.id) as any[];
  const overdueTask = taskList.find((t: any) => t.next_km && t.next_km <= car.km_actuales);
  if (overdueTask) return "Taller necesario";

  const nearTask = taskList.find((t: any) => t.next_km && (t.next_km - car.km_actuales) < ((t.interval_km || 15000) * 0.15));
  if (nearTask || itv.state === "soon" || insurance.state === "soon") return "A revisar";

  return "Al dia";
}

/** Kilómetros recorridos por mes, deducidos de las lecturas de cuentakilómetros
 *  que el usuario apunta al registrar gastos.
 *
 *  No hay una tabla de odómetro: lo que hay son lecturas sueltas. Los km de un
 *  mes se calculan como la diferencia entre su última lectura y la última
 *  lectura anterior al mes. Un mes sin ninguna lectura sale a 0 —que es
 *  honesto: no sabemos cuánto se condujo, no que no se condujera— y por eso
 *  Insights lo pinta apagado en vez de como un valle real.
 */
export function getMonthlyKm(carId: number, months = 6): { month: string; km: number }[] {
  const rows = getDb()
    .prepare(
      `SELECT strftime('%Y-%m', date) as month, MAX(km) as km
       FROM expenses
       WHERE car_id=? AND km IS NOT NULL AND km > 0
       GROUP BY month ORDER BY month ASC`,
    )
    .all(carId) as { month: string; km: number }[];

  if (rows.length === 0) return [];

  // Serie continua de los últimos `months` meses, incluidos los vacíos.
  const out: { month: string; km: number }[] = [];
  const now = new Date();
  let previousReading: number | null = null;

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    // Última lectura hasta el final de este mes.
    const upTo = rows.filter((r) => r.month <= ym);
    const reading = upTo.length ? upTo[upTo.length - 1].km : null;
    const hasOwnReading = rows.some((r) => r.month === ym);

    const km =
      hasOwnReading && previousReading != null && reading != null && reading > previousReading
        ? reading - previousReading
        : 0;

    out.push({ month: ym, km });
    if (reading != null) previousReading = reading;
  }

  return out;
}
