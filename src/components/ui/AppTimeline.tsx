"use client";

// Timeline agrupado por día (mockup 6). Cada grupo lleva su encabezado
// ("Hoy", "Ayer", "Hace 3 días") y sus entradas cuelgan de una línea vertical
// con un punto del color de la categoría.
//
// Rendimiento en listas largas: cada fila declara `content-visibility: auto`
// con un tamaño intrínseco estimado. El navegador se salta el layout y el
// pintado de todo lo que está fuera de pantalla —virtualización sin
// dependencias ni alturas fijas, y sin romper Ctrl+F ni el lector de
// pantalla, cosa que sí hacen las listas virtualizadas a mano.

import { colors, accents, type AccentToken } from "@/design/tokens";
import { cn } from "./cn";

export interface TimelineEntry {
  id: string | number;
  accent: AccentToken;
  /** La tarjeta ya renderizada (normalmente un <AppExpenseCard>). */
  content: React.ReactNode;
}

export interface TimelineGroup {
  /** "Hoy", "Ayer", "Hace 3 días", "12 marzo 2026". */
  label: string;
  /** Identidad del grupo para React. Se pasa cuando el encabezado puede
   *  repetirse —los rótulos relativos son texto, no identificadores— y se
   *  cae al propio rótulo si no viene. */
  id?: string;
  entries: TimelineEntry[];
}

export interface AppTimelineProps {
  groups: TimelineGroup[];
  className?: string;
  /** Se renderiza al final: el centinela de scroll infinito o el skeleton. */
  footer?: React.ReactNode;
}

/** Altura aproximada de una fila. Solo la usa el navegador para reservar
 *  espacio de scroll mientras la fila está fuera de pantalla; si se queda
 *  corta o larga, el scrollbar se ajusta al llegar. */
const ESTIMATED_ROW_HEIGHT = "76px";

export default function AppTimeline({ groups, className, footer }: AppTimelineProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {groups.map((group) => (
        <section key={group.id ?? group.label}>
          <h3 className="mb-3 text-caption font-semibold text-text-secondary">{group.label}</h3>

          <ul
            className="relative space-y-3 pl-6"
            style={{ borderLeft: `1px solid ${colors.border}`, marginLeft: 4 }}
          >
            {group.entries.map((entry) => (
              <li
                key={entry.id}
                className="relative"
                style={{
                  contentVisibility: "auto",
                  containIntrinsicSize: `auto ${ESTIMATED_ROW_HEIGHT}`,
                }}
              >
                <span
                  aria-hidden="true"
                  className="absolute top-6 size-2 rounded-full"
                  style={{
                    // Centrado sobre la línea vertical: la lista tiene 24px de
                    // padding y el punto mide 8px.
                    left: -28,
                    backgroundColor: accents[entry.accent],
                    // El halo del color del fondo "recorta" la línea vertical
                    // justo detrás del punto.
                    boxShadow: `0 0 0 4px ${colors.background}`,
                  }}
                />
                {entry.content}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {footer}
    </div>
  );
}
