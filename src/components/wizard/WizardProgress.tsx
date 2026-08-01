"use client";

// Indicador de progreso: raíl con un punto por paso, tramo recorrido en
// rojo y contador "2/4" a la derecha.
//
// El contador va en texto además del color porque el progreso no puede
// depender solo de un color (y porque "cuánto queda" es la primera pregunta
// que se hace quien empieza un formulario).
//
// Se anima con scaleX, no con width: cambiar el ancho relayouta en cada
// frame; escalar no.

import { motion, useReducedMotion } from "framer-motion";
import { duration, easing } from "@/design/tokens";
import { cn } from "@/components/ui/cn";

export interface WizardProgressProps {
  /** Paso actual, empezando en 1. */
  current: number;
  total: number;
  className?: string;
}

export default function WizardProgress({ current, total, className }: WizardProgressProps) {
  const reduce = useReducedMotion();
  // Con un solo paso el raíl no comunica nada, pero el hueco sí: se mantiene
  // el contador para que la cabecera no cambie de alto entre asistentes.
  const pct = total > 1 ? (current - 1) / (total - 1) : 1;

  return (
    <div
      className={cn("flex shrink-0 items-center gap-3 px-4 pb-2 pt-1", className)}
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Paso ${current} de ${total}`}
    >
      <div className="relative h-1 flex-1 rounded-pill bg-surface-elevated">
        <motion.div
          initial={false}
          animate={{ scaleX: pct }}
          transition={{ duration: reduce ? 0 : duration.page, ease: easing.out }}
          style={{ transformOrigin: "left" }}
          className="h-full w-full rounded-pill bg-primary"
        />
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{ left: total > 1 ? `${(i / (total - 1)) * 100}%` : "0%" }}
            className={cn(
              "absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-pill transition-colors",
              i <= current - 1 ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>

      <span className="tabular shrink-0 text-caption font-medium text-text-secondary">
        {current}/{total}
      </span>
    </div>
  );
}
