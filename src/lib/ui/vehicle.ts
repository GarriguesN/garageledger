// Traducciones de dominio → presentación que comparten el garaje, la lista
// de vehículos y el resumen. Están aquí y no dentro de un componente porque
// las usan tanto Server como Client Components.

import type { AccentToken } from "@/design/tokens";
import type { CarCondition } from "@/lib/db/score";
import { formatKm } from "@/lib/format";

/** Color del badge de estado del vehículo. */
export const CONDITION_ACCENT: Record<CarCondition, AccentToken> = {
  excelente: "green",
  bueno: "green",
  regular: "orange",
  malo: "danger",
};

/** URL de la foto del vehículo, o null si no tiene. Las fotos se sirven
 *  desde la API de adjuntos, que es la misma ruta que ya usan documentos y
 *  facturas. */
export function vehiclePhotoUrl(attachmentId: number | null | undefined): string | null {
  return attachmentId ? `/api/attachments/${attachmentId}` : null;
}

/** "2009 · 1.8 i-VTEC" — omite las partes que el usuario no haya rellenado
 *  en vez de dejar huecos o puntos sueltos. */
export function vehicleSubtitle(car: {
  ano: number | null;
  motor: string;
  combustible?: string;
}): string {
  return [car.ano ? String(car.ano) : null, car.motor || null]
    .filter(Boolean)
    .join(" · ");
}

export function vehicleName(car: { marca: string; modelo: string }): string {
  return `${car.marca} ${car.modelo}`.trim();
}

export function vehicleMileage(car: { km_actuales: number }): string {
  return formatKm(car.km_actuales);
}
