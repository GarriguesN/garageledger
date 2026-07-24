// Tipos del detalle del coche. Centralizados para que los subcomponentes
// no tengan que andar duplicando `any`. Origen de verdad: src/lib/db/* pero
// afinamos los shapes que el detalle usa.

// Re-exportamos MaintenanceTask desde su definición de BD. Lo centralizamos
// para que no haya dos interfaces incompatibles en el código.
export type { MaintenanceTask } from "@/lib/db/maintenance";

export interface Car {
  id: number;
  marca: string;
  modelo: string;
  generacion: string;
  motor: string;
  ano: number | null;
  puertas: number;
  km_actuales: number;
  estado: string;
  fecha_ultima_itv: string | null;
  fecha_vencimiento_seguro: string | null;
  matricula: string;
  bastidor: string;
  combustible: string;
  foto_attachment_id: number | null;
  archivado?: number;
}

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
}

export interface AddExpenseFormState {
  tipo: string;
  importe: string;
  date: string;
  descripcion: string;
  referencia: string;
  litros: string;
  km: string;
  costeTaller: string;
  selectedTask: string;
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

export interface Note {
  id: number;
  content: string;
}

export interface Attachment {
  id: number;
  original_name: string;
  file_size: number;
  mime_type: string;
}

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
