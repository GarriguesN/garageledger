// Banner de alertas por cada aviso crítico/warning que el backend devuelve
// en metrics.alerts.
//
// Rediseño Ticket 1.5 + 1.5-fix + 1.6:
//   - Cada alerta con destino real es <button> con onClick.
//   - Las alertas SIN destino se renderizan como <div role="status"> sin
//     cursor-pointer, sin role=button, sin chevron.
//   - Ticket 1.6: las alertas de mantenimiento llevan `task_id` desde el
//     backend. La clasificación devuelve `{kind:"scroll-maintenance",
//     taskId}` para esas, y `null` si el task_id falta (afordancia
//     deshabilitada, NUNCA fallback a edit-header — Ticket 1.6 explícito).

import { AlertTriangle, ChevronRight } from "lucide-react";
import type { CarMetrics } from "../lib/types";

export type AlertTarget =
  | "edit-itv"
  | "edit-seguro"
  | { kind: "scroll-maintenance"; taskId: number };

interface AlertBannerProps {
  metrics: CarMetrics;
  onAlertClick?: (target: AlertTarget) => void;
}

// Clasifica una alerta individual en un destino real, o null si no
// hay destino fiable. Para alertas de mantenimiento USA EL `task_id`
// del backend — NO parsea `part_name` del mensaje porque un mismo
// coche puede tener dos tareas con el mismo `part_name` (caso real:
// cambias aceite con marca A y luego con marca B, o dos filtros
// distintos). El parseo del mensaje no garantiza unicidad →
// sin `task_id` no hay destino → null (sin affordance).
export function classifyAlert(alert: {
  message: string;
  task_id?: number;
}): AlertTarget | null {
  // Mantenimiento: usa task_id si está y es positivo.
  if (typeof alert.task_id === "number" && alert.task_id > 0) {
    return { kind: "scroll-maintenance", taskId: alert.task_id };
  }
  const m = alert.message.toLowerCase();
  if (m.includes("itv")) return "edit-itv";
  if (m.includes("seguro")) return "edit-seguro";
  // Si por alguna razón llegó una alerta de mantenimiento SIN task_id
  // (código viejo en BD, race condition, etc.), no la llevamos a
  // edit-header — mejor sin afordancia que a un destino incorrecto.
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
        const target = classifyAlert(a);
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

        if (clickable) {
          return (
            <button
              key={i}
              type="button"
              className="flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-left transition-opacity hover:opacity-90 cursor-pointer"
              style={{ background: bg }}
              onClick={handleClick}
              aria-label={`Ir a ${parsed.title}`}
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
// es "TITULO (YYYY-MM-DD)" o "TITULO (algo entre paréntesis)".
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