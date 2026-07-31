"use client";

// Indicador de paso del wizard (mockup pantallas 1–17).
//
// Barra horizontal con un punto por paso, conectados por una línea. El
// punto del paso en curso y los anteriores van en `colors.primary`; los
// siguientes en `colors.surfaceElevated`. A la derecha va el contador
// "X / Y" en texto pequeño.
//
//   · Móvil:  los puntos son 8px, caben 4-5 sin sensación de carga.
//   · Reducción de movimiento: la animación de progreso se omite (ver
//     framer-motion + useReducedMotion más abajo).

import { motion, useReducedMotion } from "framer-motion";
import { colors, duration, easing } from "@/design/tokens";
import { cn } from "./cn";

export interface AppProgressDotsProps {
  /** Paso actual, 1-indexado (1 = primer paso). */
  current: number;
  /** Número total de pasos. */
  total: number;
  /** Etiqueta accesible para el contador. */
  ariaLabel?: string;
  className?: string;
}

export default function AppProgressDots({
  current,
  total,
  ariaLabel = "Progreso del formulario",
  className,
}: AppProgressDotsProps) {
  const reduce = useReducedMotion();
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.min(Math.max(1, current), safeTotal);
  const steps = Array.from({ length: safeTotal }, (_, i) => i + 1);

  return (
    <div
      role="progressbar"
      aria-valuenow={safeCurrent}
      aria-valuemin={1}
      aria-valuemax={safeTotal}
      aria-label={ariaLabel}
      className={cn("flex w-full items-center gap-2", className)}
    >
      <div className="relative flex flex-1 items-center">
        {/* Línea de fondo: une los puntos. */}
        <span
          aria-hidden="true"
          className="absolute left-1 right-1 top-1/2 h-px -translate-y-1/2 bg-surface-elevated"
        />
        {/* Línea rellena hasta el paso actual. */}
        <motion.span
          aria-hidden="true"
          initial={
            reduce
              ? { width: `${((safeCurrent - 1) / (safeTotal - 1 || 1)) * 100}%` }
              : { width: "0%" }
          }
          animate={{
            width: safeTotal > 1
              ? `${((safeCurrent - 1) / (safeTotal - 1)) * 100}%`
              : "0%",
          }}
          transition={{ duration: reduce ? 0 : duration.page, ease: easing.out }}
          className="absolute left-1 top-1/2 h-0.5 -translate-y-1/2"
          style={{ backgroundColor: colors.primary }}
        />
        {steps.map((step) => {
          const reached = step <= safeCurrent;
          return (
            <motion.span
              key={step}
              aria-hidden="true"
              initial={reduce ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: reduce ? 0 : duration.card,
                ease: easing.out,
                delay: reduce ? 0 : 0.04 * (step - 1),
              }}
              className="relative z-10 size-2 shrink-0 rounded-pill"
              style={{
                backgroundColor: reached ? colors.primary : colors.surfaceElevated,
                boxShadow: reached ? `0 0 0 3px ${colors.surface}` : undefined,
              }}
            />
          );
        })}
      </div>
      <span className="shrink-0 text-caption font-medium tabular-nums text-text-secondary">
        {safeCurrent} / {safeTotal}
      </span>
    </div>
  );
}
