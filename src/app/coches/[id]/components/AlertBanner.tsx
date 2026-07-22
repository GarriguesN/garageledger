// Banner rojo/ámbar por cada alerta crítica/warning que el backend
// devuelve en metrics.alerts. Se renderiza encima del timeline.

import { AlertTriangle } from "lucide-react";
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
        return (
          <div
            key={i}
            className={`card flex items-center gap-3 py-2 px-3 ${
              isCritical
                ? "border-red-300 bg-red-50/50"
                : isWarning
                ? "border-amber-200 bg-amber-50/50"
                : ""
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isCritical ? "bg-red-100" : "bg-amber-100"
              }`}
            >
              <AlertTriangle
                size={16}
                className={isCritical ? "text-red-500" : "text-amber-500"}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  isCritical ? "text-red-700" : "text-amber-700"
                }`}
              >
                {a.type === "critical" ? "Crítico" : "Aviso"}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">{a.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
