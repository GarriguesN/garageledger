"use client";

// Dos formas de progreso del mockup:
//
//   AppProgress      barra fina bajo "Próximo mantenimiento" (pantalla 2).
//   AppProgressRing  anillo de puntuación 94/100 (pantallas 2 y 12).
//
// Ambas animan al entrar en pantalla —el anillo en 1200 ms, según el spec— y
// respetan `prefers-reduced-motion` a través del CSS global.

import { motion, useReducedMotion } from "framer-motion";
import { accents, colors, duration, easing, hexToRgba, type AccentToken } from "@/design/tokens";
import { cn } from "./cn";

export interface AppProgressProps {
  /** 0–1. Se recorta al rango para que un cálculo raro no rompa la barra. */
  value: number;
  accent?: AccentToken;
  className?: string;
  ariaLabel?: string;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));

export default function AppProgress({
  value,
  accent = "green",
  className,
  ariaLabel,
}: AppProgressProps) {
  const pct = clamp01(value);
  const reduce = useReducedMotion();

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn("h-1.5 w-full overflow-hidden rounded-pill bg-surface-elevated", className)}
    >
      <motion.div
        initial={{ scaleX: reduce ? pct : 0 }}
        whileInView={{ scaleX: pct }}
        viewport={{ once: true }}
        transition={{ duration: reduce ? 0 : duration.ring, ease: easing.out }}
        style={{ backgroundColor: accents[accent], transformOrigin: "left" }}
        className="h-full w-full rounded-pill"
      />
    </div>
  );
}

export interface AppProgressRingProps {
  /** Puntuación 0–100. */
  score: number;
  /** Texto grande del centro. Por defecto, la propia puntuación. */
  label?: React.ReactNode;
  /** Texto pequeño bajo el número ("/100"). */
  sublabel?: React.ReactNode;
  accent?: AccentToken;
  size?: number;
  /** Grosor del aro. El anillo del resumen es más gordo que el del resto. */
  stroke?: number;
  /** Halo de color alrededor. Solo lo lleva el anillo protagonista del
   *  resumen, donde flota sobre la foto y necesita despegarse de ella. */
  glow?: boolean;
  className?: string;
}

export function AppProgressRing({
  score,
  label,
  sublabel = "/100",
  accent = "green",
  size = 112,
  stroke = 6,
  glow = false,
  className,
}: AppProgressRingProps) {
  const reduce = useReducedMotion();
  const pct = clamp01(score / 100);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{
        width: size,
        height: size,
        // El halo se pinta con el color del propio acento, muy diluido: es
        // separación de la foto que hay detrás, no un efecto.
        ...(glow
          ? {
              borderRadius: "50%",
              backgroundColor: colors.background,
              boxShadow: `0 0 24px 6px ${hexToRgba(accents[accent], 0.22)}`,
            }
          : null),
      }}
      role="img"
      aria-label={`Puntuación ${Math.round(score)} sobre 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colors.surfaceElevated}
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={accents[accent]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduce ? circumference * (1 - pct) : circumference }}
          whileInView={{ strokeDashoffset: circumference * (1 - pct) }}
          viewport={{ once: true }}
          transition={{ duration: reduce ? 0 : duration.ring, ease: easing.inOut }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular text-display font-bold leading-none text-text">
          {label ?? Math.round(score)}
        </span>
        {sublabel && (
          <span className="mt-0.5 text-caption font-medium text-text-secondary">{sublabel}</span>
        )}
      </div>
    </div>
  );
}
