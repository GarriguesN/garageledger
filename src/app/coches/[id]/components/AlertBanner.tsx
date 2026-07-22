// Banner de alertas por cada aviso crítico/warning que el backend devuelve
// en metrics.alerts.
//
// Rediseño Ticket 1.5 + 1.5-fix: cada alerta SERÁ clicable si tiene un
// destino real en la UI; las que NO tienen destino se renderizan sin
// affordance (sin cursor-pointer, sin role="button", sin chevron) — Ticket
// 1.5-fix prohíbe dejar apariencia de acción sin acción.
//
// Destinos por tipo de alerta (en este orden de prioridad):
//   1. Texto contiene "ITV"        → header en modo edición (campo Última ITV)
//   2. Texto contiene "Seguro"     → header en modo edición (campo Vencimiento seguro)
//   3. Texto contiene "taller"     → header en modo edición (sin campo específico;
//                                     la tarea se gestiona vía MaintenanceSchedule)
//   4. Cualquier otro              → sin handler, sin affordance clicable.

import { AlertTriangle, ChevronRight } from "lucide-react";
import type { CarMetrics } from "../lib/types";

export type AlertTarget = "edit-itv" | "edit-seguro" | "edit-header";

interface AlertBannerProps {
  metrics: CarMetrics;
  onAlertClick?: (target: AlertTarget) => void;
}

// Exportado también para tests (Ticket 1.5-fix). NO se considera API
// pública — solo lo usan scripts/test-affordances.ts.
export function classifyAlert(message: string): AlertTarget | null {
  const m = message.toLowerCase();
  if (m.includes("itv")) return "edit-itv";
  if (m.includes("seguro")) return "edit-seguro";
  // "taller necesario" o "en N km" (warning de mantenimiento próximo).
  if (m.includes("taller") || /en\s+\d+\s*km/.test(m)) return "edit-header";
  return null;
}

export default function AlertBanner({ metrics, onAlertClick }: AlertBannerProps) {
  if (metrics.alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {metrics.alerts.map((a, i) => {
        const isCritical = a.type === "critical";
        const isWarning = a.type === "warning";

        const bg = isCritical ? "#fde7e6" : "#fef3c7";
        const fg = isCritical ? "#c3423f" : "#f59e0b";
        const titleColor = isCritical ? "#a83633" : "#92400e";

        const parsed = parseTitleAndDate(a.message);
        const target = classifyAlert(a.message);
        const clickable = target !== null && typeof onAlertClick === "function";

        const handleClick = () => {
          if (target && onAlertClick) onAlertClick(target);
        };

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
            {clickable && (
              <ChevronRight
                size={18}
                className="flex-shrink-0"
                style={{ color: fg }}
                aria-hidden
              />
            )}
          </>
        );

        // Clickable → <button> real; no-clickable → <div> sin affordance.
        if (clickable) {
          return (
            <button
              key={i}
              type="button"
              className="flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-left transition-opacity hover:opacity-90 cursor-pointer"
              style={{ background: bg }}
              onClick={handleClick}
              aria-label={`Corregir ${parsed.title}`}
            >
              {content}
            </button>
          );
        }
        return (
          <div
            key={i}
            className="flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-left"
            style={{ background: bg }}
            role="status"
            aria-label={parsed.title}
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
function parseTitleAndDate(message: string): { title: string; subtitle: string | null } {
  const m = message.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (!m) return { title: message, subtitle: null };
  const title = m[1].trim();
  const paren = m[2].trim();
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