// Tipos del detalle del coche. Centralizados para que los subcomponentes
// no tengan que andar duplicando `any`. Origen de verdad: src/lib/db/* pero
// afinamos los shapes que el detalle usa.

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
}

export interface TimelineEntry {
  id: number;
  tipo: string;
  importe: number;
  date: string;
  descripcion: string | null;
  referencia: string | null;
  litros: number | null;
  km: number | null;
  coste_estimado_taller: number | null;
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

export interface MaintenanceTask {
  id: number;
  part_name: string;
  part_brand: string;
  part_model: string;
  next_km: number | null;
  next_date: string | null;
  current_km: number | null;
  interval_km: number | null;
  interval_months: number | null;
  notes: string;
  completed: number;
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
    // Ticket 1.6: presente solo en alertas de mantenimiento. Identifica
    // la fila exacta de maintenance_tasks que disparó la alerta para
    // scroll + highlight desde el AlertBanner.
    task_id?: number;
  }[];
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
}

export interface EditExpenseFormState {
  id?: number;
  tipo: string;
  importe: number;
  date: string;
  descripcion: string;
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
  puertas: string | number;
  km_actuales: string | number;
  estado: string;
  fecha_ultima_itv: string;
  fecha_vencimiento_seguro: string;
}
