// Banner de alertas por cada aviso crítico/warning que el backend devuelve
// en metrics.alerts.
//
// Ticket: las alertas son SOLO informativas. No son botones: no tienen
// cursor-pointer, no abren destino, no hacen scroll. Se renderizan como
// <div role="status"> para que lectores de pantalla las anuncien, y se
// muestran con el icono, el título y la fecha contextual cuando aplica.

import { AlertTriangle } from "lucide-react";
import type { CarMetrics } from "../lib/types";

// Mantenemos el tipo porque tests/mocks pueden importarlo.
export type AlertTarget =
  | "edit-itv"
  | "edit-seguro"
  | { kind: "scroll-maintenance"; taskId: number };

interface AlertBannerProps {
  metrics: CarMetrics;
}

// Ticket: las alertas son SOLO informativas. Esta función de clasificación
// se conserva porque otros tests/mocks la importan, pero ya no se usa
// para decidir entre button/div: todo se renderiza como <div role="status">.
export function classifyAlert(alert: {
  message: string;
  task_id?: number;
}): AlertTarget | null {
  if (typeof alert.task_id === "number" && alert.task_id > 0) {
    return { kind: "scroll-maintenance", taskId: alert.task_id };
  }
  const m = alert.message.toLowerCase();
  if (m.includes("itv")) return "edit-itv";
  if (m.includes("seguro")) return "edit-seguro";
  return null;
}

export default function AlertBanner({ metrics }: AlertBannerProps) {
  if (metrics.alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {metrics.alerts.map((a, i) => {
        const isCritical = a.type === "critical";
        const bg = isCritical ? "#fde7e6" : "#fef3c7";
        const fg = isCritical ? "#c3423f" : "#f59e0b";
        const titleColor = isCritical ? "#a83633" : "#92400e";

        const parsed = parseTitleAndDate(a.message);

        return (
          <div
            key={i}
            className="flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-left"
            style={{ background: bg }}
            role="status"
            aria-label={parsed.title}
          >
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