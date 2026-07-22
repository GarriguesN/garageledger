// Banner de alertas por cada aviso crítico/warning que el backend devuelve
// en metrics.alerts. Rediseño Ticket 1.5: banner ancho completo con fondo
// rojo/ámbar suave, icono de alerta en círculo, texto con título + fecha
// (o subtítulo), chevron a la derecha y clicable.
//
// NO se modifica la lógica: el componente sigue iterando metrics.alerts[] y
// decidiendo critical/warning igual que antes. Solo cambia la presentación.

import { AlertTriangle, ChevronRight } from "lucide-react";
import type { CarMetrics } from "../lib/types";

interface AlertBannerProps {
  metrics: CarMetrics;
}

export default function AlertBanner({ metrics }: AlertBannerProps) {
  if (metrics.alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {metrics.alerts.map((a, i) => {
        const isCritical = a.type === "critical";
        const isWarning = a.type === "warning";

        // Tokens visuales según severidad (mismo lenguaje que el resto de
        // la app: crítico = rojo brand, warning = ámbar).
        const bg = isCritical ? "#fde7e6" : "#fef3c7";
        const fg = isCritical ? "#c3423f" : "#f59e0b";
        const titleColor = isCritical ? "#a83633" : "#92400e";

        // El backend mete la fecha dentro del mensaje (ej.: "ITV caducada
        // (2025-03-15)"). Para el rediseño queremos título en una línea y
        // fecha en otra. Como no tenemos un campo separado en metrics.alerts
        // (Ticket 1.5 no introduce lógica nueva), parseamos el mensaje
        // cuando viene entre paréntesis con formato YYYY-MM-DD; si no, lo
        // mostramos tal cual como subtítulo.
        const parsed = parseTitleAndDate(a.message);

        // Rediseño Ticket 1.5: el banner es visualmente clicable (chevron
        // + cursor-pointer) pero el handler onClick real se mantiene en
        // cero — Ticket 1.5 no introduce navegación nueva. El cursor
        // pointer se justifica por el chevron, que indica affordance.
        const content = (
          <>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: isCritical ? "#fff" : "#fef9c3", color: fg }}
              aria-hidden
            >
              <AlertTriangle size={18} strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-[14px] font-semibold leading-tight"
                style={{ color: titleColor }}
              >
                {parsed.title}
              </p>
              {parsed.subtitle && (
                <p
                  className="text-[12px] leading-tight mt-0.5"
                  style={{ color: "#4a4548" }}
                >
                  {parsed.subtitle}
                </p>
              )}
            </div>
            <ChevronRight
              size={18}
              className="flex-shrink-0"
              style={{ color: fg }}
              aria-hidden
            />
          </>
        );

        return (
          <div
            key={i}
            className="flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-left cursor-pointer transition-opacity hover:opacity-90"
            style={{ background: bg }}
            role="button"
            tabIndex={0}
            aria-label={`Detalle de ${parsed.title}`}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────── helpers ─────────────── */

// Parsea el mensaje del backend en { title, subtitle } cuando el formato
// es "TITULO (YYYY-MM-DD)" o "TITULO (algo entre paréntesis)". Si no
// matchea, devuelve title = message completo y subtitle = null.
//
// Esto NO añade lógica nueva: el backend ya produce ese formato en
// `src/lib/db/metrics.ts` (líneas 65/77/87/89). Solo lo separamos para
// que el rediseño visual tenga dos líneas.
function parseTitleAndDate(message: string): { title: string; subtitle: string | null } {
  const m = message.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (!m) return { title: message, subtitle: null };
  const title = m[1].trim();
  const paren = m[2].trim();
  // Si parece fecha YYYY-MM-DD, formateamos a es-ES corto.
  const dateMatch = paren.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const [, y, mo, d] = dateMatch;
    const dt = new Date(`${y}-${mo}-${d}T12:00:00`);
    if (!Number.isNaN(dt.getTime())) {
      const human = dt.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
      return { title, subtitle: human };
    }
  }
  return { title, subtitle: paren };
}