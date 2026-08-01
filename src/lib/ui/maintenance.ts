// Traducción de una tarea de mantenimiento a lo que pintan las tarjetas de
// las pantallas 2, 7 y 11: icono, estado (verde/ámbar/rojo), periodicidad y
// la línea "en 1.420 km — o en 45 días".
//
// Una tarea puede tener plazo por kilómetros, por fecha o por ambos. Cuando
// tiene los dos, manda el que llegue antes: el aceite caduca por tiempo
// aunque el coche no se mueva, y por km aunque se acabe de cambiar.

import type { IconName } from "@/design/tokens/icons";
import type { StatusToken } from "@/design/tokens";
import type { MaintenanceTask } from "@/lib/db/maintenance";
import { formatKm, formatNumber, formatDeadline, daysUntil, formatMonthYear } from "@/lib/format";

/** icon_key del catálogo de presets → nombre del registro de iconos. */
const ICON_BY_KEY: Record<string, IconName> = {
  engine_oil: "droplet",
  engine_air_filter: "wind",
  droplet: "droplet",
  coolant: "thermometer",
  spark: "bulb",
  coil: "preferences",
  belt: "cog",
  brake_pads: "square",
  disc: "tire",
  brake_fluid: "droplet",
  tire: "tire",
  tire_rotation: "rotate",
  wheel: "circleDot",
  battery: "battery",
  bulb: "bulb",
  ac: "snowflake",
  cabin_filter: "wind",
  transmission: "cog",
  clutch: "cog",
  suspension: "preferences",
  wiper: "wind",
  itv: "shield",
};

export function maintenanceIcon(task: { icon_key: string | null; preset_key?: string | null }): IconName {
  return (task.icon_key && ICON_BY_KEY[task.icon_key]) || "wrench";
}

export interface MaintenanceView {
  id: number;
  title: string;
  icon: IconName;
  status: StatusToken;
  /** "Cada 10.000 km / 12 meses" */
  frequency?: string;
  /** "en 1.420 km", "Vencido". */
  remaining?: string;
  /** "o en 45 días", "hace 13 días", "(Oct 2026)". */
  remainingDetail?: string;
  /** 0–1: cuánto se ha consumido del intervalo. Alimenta la barra del
   *  resumen. null si la tarea no tiene intervalo con el que comparar. */
  progress: number | null;
  /** Km que faltan; negativo si ya se pasó. null si no aplica. */
  kmLeft: number | null;
  /** Días que faltan; negativo si ya se pasó. null si no aplica. */
  daysLeft: number | null;
}

/** "Cada 10.000 km / 12 meses" — omite la parte que no exista. */
function frequencyLabel(task: MaintenanceTask): string | undefined {
  const parts: string[] = [];
  if (task.interval_km) parts.push(`Cada ${formatNumber(task.interval_km)} km`);
  if (task.interval_months) {
    const m = task.interval_months;
    parts.push(m % 12 === 0 ? `${m / 12} ${m === 12 ? "año" : "años"}` : `${m} meses`);
  }
  if (parts.length === 0) return undefined;
  // "Cada 10.000 km / 12 meses" en vez de "Cada 10.000 km / Cada 12 meses".
  return parts.length === 2 ? `${parts[0]} / ${parts[1]}` : parts[0];
}

export function toMaintenanceView(task: MaintenanceTask, currentKm: number): MaintenanceView {
  const kmLeft = task.next_km != null ? task.next_km - currentKm : null;
  const daysLeft = daysUntil(task.next_date);

  // Fracción consumida de cada plazo; manda el más avanzado.
  const kmProgress =
    task.next_km != null && task.interval_km
      ? 1 - kmLeft! / task.interval_km
      : null;
  const dateProgress =
    task.next_date != null && task.interval_months
      ? 1 - daysLeft! / (task.interval_months * 30)
      : null;

  const progress =
    kmProgress != null && dateProgress != null
      ? Math.max(kmProgress, dateProgress)
      : kmProgress ?? dateProgress;

  const overdue = (kmLeft != null && kmLeft <= 0) || (daysLeft != null && daysLeft < 0);
  const soon =
    !overdue &&
    ((kmLeft != null && task.interval_km != null && kmLeft < task.interval_km * 0.15) ||
      (daysLeft != null && daysLeft < 30));

  const status: StatusToken = overdue ? "critical" : soon ? "warning" : "ok";

  // Línea inferior. Con vencimiento, el mockup pone "Vencido" + cuánto hace.
  let remaining: string | undefined;
  let remainingDetail: string | undefined;

  if (overdue) {
    remaining = "Vencido";
    remainingDetail =
      daysLeft != null && daysLeft < 0
        ? (formatDeadline(task.next_date) ?? undefined)
        : kmLeft != null
          ? `${formatKm(Math.abs(kmLeft))} de más`
          : undefined;
  } else {
    if (kmLeft != null) remaining = `en ${formatKm(kmLeft)}`;
    if (daysLeft != null) {
      const dl = formatDeadline(task.next_date);
      // Si hay ambos plazos, el de fecha es el secundario ("o en 45 días").
      if (remaining) {
        remainingDetail = daysLeft > 60 ? `(${formatMonthYear(task.next_date)})` : `o ${dl}`;
      } else {
        remaining = dl ?? undefined;
        remainingDetail = daysLeft > 60 ? `(${formatMonthYear(task.next_date)})` : undefined;
      }
    }
  }

  return {
    id: task.id,
    title: task.part_name,
    icon: maintenanceIcon(task),
    status,
    frequency: frequencyLabel(task),
    remaining,
    remainingDetail,
    progress: progress != null ? Math.min(1, Math.max(0, progress)) : null,
    kmLeft,
    daysLeft,
  };
}

/** Ordena por urgencia: primero lo vencido, luego lo que queda menos. */
export function sortByUrgency(views: MaintenanceView[]): MaintenanceView[] {
  const rank = { critical: 0, warning: 1, ok: 2, neutral: 3 } as const;
  return [...views].sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    const aKm = a.kmLeft ?? Number.MAX_SAFE_INTEGER;
    const bKm = b.kmLeft ?? Number.MAX_SAFE_INTEGER;
    return aKm - bKm;
  });
}
