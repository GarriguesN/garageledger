// Tipos del detalle del coche. Centralizados para que los subcomponentes
// no tengan que andar duplicando `any`. Origen de verdad: src/lib/db/* pero
// afinamos los shapes que el detalle usa.

// Re-exportamos MaintenanceTask y Car desde su definición de BD. Lo
// centralizamos para que no haya dos interfaces incompatibles en el código
// (audit:M-2 — antes Car se redefinía aquí como subconjunto de campos).
export type { MaintenanceTask } from "@/lib/db/maintenance";
export type { Car } from "@/lib/db/cars";

export interface TimelineEntry {
  id: number;
  date: string;
  tipo: string;
  importe: number;
  descripcion: string | null;
  referencia?: string | null;
  litros?: number | null;
  km?: number | null;
  coste_estimado_taller?: number | null;
  preset_key?: string | null;
}

export interface AddExpenseFormState {
  tipo: string;
  /** Ticket 1.23: id semántico estable del catálogo. */
  tipoId?: string;
  importe: string;
  date: string;
  descripcion: string;
  referencia: string;
  litros: string;
  km: string;
  costeTaller: string;
  selectedTask: string;
  /** Ticket 1.17: clave del preset elegido en el form de gasto
   *  (e.g. "engine_oil_filter"). Vacío cuando el usuario eligió
   *  "Otro (texto libre)" o no es un gasto de mantenimiento. */
  presetKey: string;
  /** Ticket 1.16-fix: cuando el gasto es de mantenimiento y se eligió
   *  tarea, indica si queremos programar la siguiente automáticamente.
   *  Default true si la tarea tiene interval_km/interval_months; el
   *  padre lo auto-inicializa en el onChange del selector de tarea. */
  scheduleNext: boolean;
  /** Ticket 1.20: cuando tipo='Impuestos', el checkbox controla si este
   *  pago se considera el IVTM (impuesto de circulación) anual y por
   *  tanto debe actualizar cars.fecha_impuesto_circulacion. El padre
   *  (CarDetailClient) lee este flag y decide. */
  impuesto_circulacion: boolean;
}

export interface EditExpenseFormState {
  id: number;
  tipo: string;
  importe: number;
  date: string;
  descripcion: string;
  referencia?: string | null;
  litros?: number | null;
  km?: number | null;
  coste_estimado_taller?: number | null;
}

export interface CarEditFormState {
  marca: string;
  modelo: string;
  generacion: string;
  motor: string;
  ano: string | number;
  puertas: number;
  km_actuales: number;
  estado: string;
  fecha_ultima_itv: string;
  fecha_vencimiento_seguro: string;
}

// Re-exportamos CarNote/Attachment desde su definición de BD (mismo motivo
// que Car/MaintenanceTask arriba: una sola fuente de verdad).
export type { CarNote as Note } from "@/lib/db/notes";
export type { Attachment } from "@/lib/db/attachments";

export interface CarMetrics {
  monthly: { current: number; previous: number };
  projectedAnnual: number;
  diy: number;
  totalCostPerKm: number | null;
  fuel: {
    l100km: number | null;
    costPerKm: number | null;
    pricePerLiter: number | null;
  };
  alerts: {
    type: "critical" | "warning" | "info";
    message: string;
    task_id?: number;
  }[];
}
