// Traducción de los avisos del vehículo a lo que pinta la sección "Avisos"
// del resumen (mockup 2): icono redondo por severidad, título, motivo en el
// color de esa severidad y a dónde se va al tocar.
//
// La lista de avisos que devuelve metrics.ts solo contiene problemas. El
// mockup enseña además una fila verde ("Seguro del vehículo — Vigente hasta
// 12/01/2027"): es el mismo dato del coche visto por el lado bueno, así que
// se añade aquí, en presentación, y no en metrics —donde convertiría un
// panel de notificaciones en una lista de cosas que van bien.

import type { AccentToken } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";
import { formatDate } from "@/lib/format";

/** El aviso tal y como sale de getCarMetrics(). */
export interface CarAlert {
  type: "critical" | "warning" | "info";
  message: string;
  title?: string;
  detail?: string;
  task_id?: number;
  topic?: "maintenance" | "itv" | "insurance" | "tax" | "document";
}

export interface AlertView {
  id: string;
  icon: IconName;
  accent: AccentToken;
  title: string;
  detail?: string;
  href: string;
}

const ACCENT_BY_TYPE: Record<CarAlert["type"], AccentToken> = {
  critical: "danger",
  warning: "orange",
  info: "green",
};

const ICON_BY_TYPE: Record<CarAlert["type"], IconName> = {
  critical: "warning",
  warning: "alert",
  info: "success",
};

/** A dónde lleva cada aviso: al sitio donde se resuelve, no a una pantalla
 *  informativa. Las fechas legales se editan en la ficha del vehículo. */
export function alertHref(carId: number, alert: Pick<CarAlert, "task_id" | "topic">): string {
  if (alert.task_id) return `/coches/${carId}/mantenimiento/${alert.task_id}`;
  if (alert.topic === "document") return `/coches/${carId}/documentos`;
  if (alert.topic === "maintenance") return `/coches/${carId}/mantenimiento`;
  return `/coches/${carId}/editar`;
}

export function toAlertViews(
  carId: number,
  alerts: CarAlert[],
  car: { fecha_vencimiento_seguro: string | null },
): AlertView[] {
  const views: AlertView[] = alerts.map((alert, i) => ({
    id: `${alert.topic ?? "alert"}-${alert.task_id ?? i}`,
    icon: ICON_BY_TYPE[alert.type],
    accent: ACCENT_BY_TYPE[alert.type],
    title: alert.title ?? alert.message,
    detail: alert.detail,
    href: alertHref(carId, alert),
  }));

  // El seguro en regla solo se anuncia si nadie ha avisado ya de él: dos
  // filas del mismo seguro, una roja y otra verde, sería absurdo.
  const insuranceWarned = alerts.some((a) => a.topic === "insurance");
  if (car.fecha_vencimiento_seguro && !insuranceWarned) {
    views.push({
      id: "insurance-ok",
      icon: "success",
      accent: "green",
      title: "Seguro del vehículo",
      detail: `Vigente hasta ${formatDate(car.fecha_vencimiento_seguro)}`,
      href: `/coches/${carId}/editar`,
    });
  }

  return views;
}
