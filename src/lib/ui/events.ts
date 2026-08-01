// "Próximos eventos" del resumen (mockup 2): lo que le va a pasar al coche,
// venga de una tarea de mantenimiento o de una fecha legal.
//
// Cada evento se lee en cuatro esquinas, como en el mockup:
//
//   Cambio de aceite            en 1.420 km   ← título / plazo principal
//   Cada 10.000 km              o en 45 días  ← descripción / plazo secundario
//
// Las fechas de ITV e impuesto salen de las mismas funciones que usan los
// avisos (getItvDueDate, getTaxDueDate), así que las dos secciones nunca
// pueden decir fechas distintas del mismo trámite.

import type { AccentToken, StatusToken } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";
import type { Car } from "@/lib/db/cars";
import { getItvDueDate, getTaxDueDate } from "@/lib/db/metrics";
import { formatDate, formatDeadline } from "@/lib/format";
import type { MaintenanceView } from "./maintenance";

export interface EventView {
  id: string;
  icon: IconName;
  accent: AccentToken;
  title: string;
  /** Plazo principal, a la derecha del título: "en 1.420 km", "15/09/2025". */
  value?: string;
  /** Qué es el evento: "Inspección técnica", "Renovación". */
  subtitle?: string;
  /** Plazo secundario: "o en 45 días", "en 5 meses". */
  detail?: string;
  href: string;
  /** Días que faltan, solo para ordenar. */
  daysLeft: number | null;
  /** Urgencia, solo para ordenar y elegir color. */
  status: StatusToken;
}

const ACCENT_BY_STATUS: Record<StatusToken, AccentToken> = {
  ok: "green",
  warning: "orange",
  critical: "danger",
  neutral: "blue",
};

const RANK: Record<StatusToken, number> = { critical: 0, warning: 1, ok: 2, neutral: 3 };

/** Días hasta una fecha ya calculada. */
function daysTo(due: Date): number {
  return Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/** Un trámite con fecha (ITV, seguro, impuesto) como evento. */
function dateEvent(opts: {
  id: string;
  icon: IconName;
  accent: AccentToken;
  title: string;
  subtitle: string;
  due: Date;
  iso: string;
  href: string;
}): EventView {
  const days = daysTo(opts.due);
  return {
    id: opts.id,
    icon: opts.icon,
    accent: opts.accent,
    title: opts.title,
    subtitle: opts.subtitle,
    value: formatDate(opts.iso),
    detail: formatDeadline(opts.iso) ?? undefined,
    href: opts.href,
    daysLeft: days,
    // Un trámite legal caducado es crítico; a menos de dos meses, aviso.
    status: days < 0 ? "critical" : days < 60 ? "warning" : "ok",
  };
}

/** Fecha ISO de un Date, para poder reutilizar formatDeadline. */
function isoOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function upcomingEvents(
  car: Car,
  tasks: MaintenanceView[],
  limit = 4,
): EventView[] {
  const events: EventView[] = tasks.map((t) => ({
    id: `task-${t.id}`,
    icon: t.icon,
    accent: ACCENT_BY_STATUS[t.status],
    title: t.title,
    subtitle: t.frequency,
    value: t.remaining,
    detail: t.remainingDetail,
    href: `/coches/${car.id}/mantenimiento/${t.id}`,
    daysLeft: t.daysLeft,
    status: t.status,
  }));

  const itv = getItvDueDate(car);
  if (itv) {
    events.push(
      dateEvent({
        id: "itv",
        icon: "shield",
        accent: "blue",
        title: "ITV",
        subtitle: "Inspección técnica",
        due: itv,
        iso: isoOf(itv),
        href: `/coches/${car.id}/editar`,
      }),
    );
  }

  if (car.fecha_vencimiento_seguro) {
    const due = new Date(car.fecha_vencimiento_seguro + "T12:00:00");
    events.push(
      dateEvent({
        id: "seguro",
        icon: "shield",
        accent: "purple",
        title: "Seguro del vehículo",
        subtitle: "Renovación",
        due,
        iso: car.fecha_vencimiento_seguro,
        href: `/coches/${car.id}/editar`,
      }),
    );
  }

  const tax = getTaxDueDate(car);
  if (tax) {
    events.push(
      dateEvent({
        id: "ivtm",
        icon: "tax",
        accent: "cyan",
        title: "Impuesto de circulación",
        subtitle: "IVTM",
        due: tax,
        iso: isoOf(tax),
        href: `/coches/${car.id}/editar`,
      }),
    );
  }

  // Primero lo urgente y, dentro de cada nivel, lo que llega antes. Un
  // evento medido solo en kilómetros no tiene fecha con la que competir, así
  // que se queda al final de su grupo.
  return events
    .sort((a, b) => {
      if (RANK[a.status] !== RANK[b.status]) return RANK[a.status] - RANK[b.status];
      return (a.daysLeft ?? Number.MAX_SAFE_INTEGER) - (b.daysLeft ?? Number.MAX_SAFE_INTEGER);
    })
    .slice(0, limit);
}
