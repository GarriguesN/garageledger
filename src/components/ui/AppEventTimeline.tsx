// "Próximos eventos" del resumen (mockup 2): una línea vertical que recorre
// la sección, un chip de icono por evento y, colgando de la línea, una
// tarjeta con cuatro esquinas de información:
//
//   Cambio de aceite            en 1.420 km
//   Cada 10.000 km              o en 45 días
//
// La línea es un único elemento absoluto de arriba abajo, no un borde por
// fila: así no se corta en la separación entre tarjetas, que es justo lo que
// hace que se lea como una línea de tiempo y no como una lista.

import Link from "next/link";
import { accents, colors, type AccentToken } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";
import AppIconChip from "./AppIconChip";
import { cn } from "./cn";

export interface TimelineEventItem {
  id: string;
  icon: IconName;
  accent: AccentToken;
  title: React.ReactNode;
  /** Plazo principal, a la derecha del título. */
  value?: React.ReactNode;
  /** Descripción bajo el título. */
  subtitle?: React.ReactNode;
  /** Plazo secundario, bajo el plazo principal. */
  detail?: React.ReactNode;
  href?: string;
}

export interface AppEventTimelineProps {
  events: TimelineEventItem[];
  className?: string;
}

/** Dónde cae la línea vertical: después del chip de 40px y de su separación
 *  de 12px. El punto de cada evento se centra justo encima. */
const LINE_X = 52;
const DOT_SIZE = 8;

export default function AppEventTimeline({ events, className }: AppEventTimelineProps) {
  return (
    <ul className={cn("relative space-y-3", className)}>
      <span
        aria-hidden="true"
        className="absolute inset-y-3 w-px"
        style={{ left: LINE_X, backgroundColor: colors.border }}
      />

      {events.map((event) => {
        const card = (
          <div className="rounded-chip border border-border bg-surface-elevated p-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-body font-semibold text-text">{event.title}</span>
              {event.value && (
                <span className="tabular shrink-0 text-body font-semibold text-text">
                  {event.value}
                </span>
              )}
            </div>
            {(event.subtitle || event.detail) && (
              <div className="mt-0.5 flex items-baseline justify-between gap-3">
                <span className="truncate text-caption text-text-muted">{event.subtitle}</span>
                {event.detail && (
                  <span className="tabular shrink-0 text-caption text-text-muted">
                    {event.detail}
                  </span>
                )}
              </div>
            )}
          </div>
        );

        return (
          <li key={event.id} className="flex items-center gap-3">
            <AppIconChip icon={event.icon} accent={event.accent} />
            <div className="relative min-w-0 flex-1 pl-4">
              <span
                aria-hidden="true"
                className="absolute top-1/2 rounded-full"
                style={{
                  left: -DOT_SIZE / 2,
                  marginTop: -DOT_SIZE / 2,
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  backgroundColor: accents[event.accent],
                  // Halo del color del fondo: recorta la línea tras el punto.
                  boxShadow: `0 0 0 3px ${colors.background}`,
                }}
              />
              {event.href ? (
                <Link href={event.href} className="block">
                  {card}
                </Link>
              ) : (
                card
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
