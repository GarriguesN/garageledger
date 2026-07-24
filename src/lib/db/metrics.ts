import { getDb } from "./core";
import { getCar } from "./cars";
import { getMantenimientoConfig } from "./maintenance";

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
  const row = getDb().prepare("SELECT COALESCE(SUM(coste_estimado_taller-importe),0) as savings FROM expenses WHERE car_id=? AND tipo='Mantenimiento (DIY)' AND coste_estimado_taller IS NOT NULL").get(carId) as any;
  return row.savings;
}

export function getFuelConsumption(carId: number): { l100km: number | null; costPerKm: number | null; pricePerLiter: number | null } {
  const refuels = getDb().prepare("SELECT date, importe, litros, km FROM expenses WHERE car_id=? AND tipo='Carburante' AND km IS NOT NULL AND litros IS NOT NULL ORDER BY date ASC").all(carId) as any[];
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

export function getCarMetrics(carId: number) {
  const monthly = getMonthlySpend(carId);
  const diy = getDiySavings(carId);
  const fuel = getFuelConsumption(carId);
  const totalCostPerKm = getTotalCostPerKm(carId);
  const projectedAnnual = monthly.current * 12;
  const car = getCar(carId);
  const alerts: { type: 'critical' | 'warning' | 'info'; message: string; task_id?: number }[] = [];
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
          task_id: t.id,
        });
      } else if (t.next_km && (t.next_km - car.km_actuales) < (t.interval_km || 15000) * 0.15) {
        alerts.push({
          type: 'warning',
          message: `${t.part_name}: en ${(t.next_km - car.km_actuales).toLocaleString("es-ES")} km`,
          task_id: t.id,
        });
      }
    }

    // ITV alerts
    if (car.fecha_ultima_itv) {
      const lastItv = new Date(car.fecha_ultima_itv + "T12:00:00");
      const interval = car.ano && car.ano > (new Date().getFullYear() - 10) ? 24 : 12;
      const due = new Date(lastItv.getTime() + interval * 30 * 24 * 60 * 60 * 1000);
      if (due < new Date()) {
        alerts.push({ type: 'critical', message: `ITV caducada (${car.fecha_ultima_itv})` });
      } else if ((due.getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000) {
        alerts.push({ type: 'warning', message: `ITV próxima: ${due.toLocaleDateString("es-ES")}` });
      }
    }

    // Seguro alerts
    if (car.fecha_vencimiento_seguro) {
      const daysLeft = Math.ceil((new Date(car.fecha_vencimiento_seguro + "T12:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) {
        alerts.push({ type: 'critical', message: `Seguro caducado (${car.fecha_vencimiento_seguro})` });
      } else if (daysLeft < 60) {
        alerts.push({ type: 'warning', message: `Seguro vence en ${daysLeft} días (${car.fecha_vencimiento_seguro})` });
      }
    }

    // Impuesto de circulación (IVTM) — anual, misma lógica que ITV.
    if (car.fecha_impuesto_circulacion) {
      const lastTax = new Date(car.fecha_impuesto_circulacion + "T12:00:00");
      const dueTax = new Date(lastTax.getTime() + 365 * 24 * 60 * 60 * 1000);
      if (dueTax < new Date()) {
        alerts.push({ type: 'critical', message: `Impuesto de circulación caducado (${car.fecha_impuesto_circulacion})` });
      } else if ((dueTax.getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000) {
        alerts.push({ type: 'warning', message: `Impuesto de circulación próximo: ${dueTax.toLocaleDateString("es-ES")}` });
      }
    }
  }
  const estado = car ? computeCarEstado(car) : null;
  return { monthly, diy, fuel, totalCostPerKm, projectedAnnual, alerts, estado };
}

export function getTimeline(carId: number, limit = 50): any[] {
  return getDb().prepare("SELECT id, date, tipo, importe, descripcion, litros, km, coste_estimado_taller, 'expense' as entry_type FROM expenses WHERE car_id=? ORDER BY date DESC, id DESC LIMIT ?").all(carId, limit) as any[];
}

export function getMonthlyHistory(carId: number, months = 6): { month: string; total: number }[] {
  return getDb().prepare(`SELECT strftime('%Y-%m', date) as month, SUM(importe) as total FROM expenses WHERE car_id=? AND date>=date('now','-${months} months','start of month') GROUP BY month ORDER BY month ASC`).all(carId) as any[];
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr + "T12:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function computeCarEstado(car: any, tasks?: any[]): string {
  const daysItv = daysUntil(car.fecha_ultima_itv);
  const daysSeg = daysUntil(car.fecha_vencimiento_seguro);
  if (!car.fecha_ultima_itv) return "A revisar"; // no ITV registered

  // Check ITV expired
  if (daysItv !== null && daysItv! < 0 && Math.abs(daysItv!) > 30) return "ITV Caducada";
  // Check seguro expired
  if (daysSeg !== null && daysSeg! < 0) return "Seguro Caducado";

  // Check maintenance tasks
  const taskList = tasks ?? getDb().prepare("SELECT * FROM maintenance_tasks WHERE car_id=? AND completed=0").all(car.id) as any[];
  const overdueTask = taskList.find((t: any) => t.next_km && t.next_km <= car.km_actuales);
  if (overdueTask) return "Taller necesario";

  // Check if anything is near
  const nearTask = taskList.find((t: any) => t.next_km && (t.next_km - car.km_actuales) < ((t.interval_km || 15000) * 0.15));
  const nearItv = daysItv !== null && daysItv! < 60;
  const nearSeg = daysSeg !== null && daysSeg! < 60;
  if (nearTask || nearItv || nearSeg || (daysItv !== null && daysItv! < 0)) return "A revisar";

  return "Al dia";
}
