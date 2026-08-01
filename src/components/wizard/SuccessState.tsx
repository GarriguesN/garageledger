"use client";

// Estado final de todos los asistentes (mockup 18): confeti, marca de
// verificación, el dato que se acaba de guardar y dos salidas —seguir
// mirando lo guardado, o encadenar otro.
//
// Es el mismo componente para todos los formularios: lo único que cambia es
// el texto y la cifra. Así, después del primer guardado, el usuario ya sabe
// cómo termina cualquier otro.
//
// El confeti se calcula con una secuencia determinista (no Math.random) para
// que servidor y cliente pinten lo mismo, y desaparece por completo con
// "reducir movimiento" activado.

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "@/design/tokens/icons";
import { accents, colors, duration, easing, hexToRgba, iconSize, strokeWidth } from "@/design/tokens";
import AppButton from "@/components/ui/AppButton";

export interface SuccessStateProps {
  /** Titular grande. */
  title?: string;
  /** Qué se ha guardado, en una línea. */
  message: string;
  /** Cifra protagonista (importe, kilómetros…). */
  headline?: React.ReactNode;
  /** Chip bajo la cifra: la descripción de lo guardado. */
  detail?: React.ReactNode;
  /** Fecha u otro metadato pequeño. */
  meta?: React.ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

const CONFETTI_ACCENTS = ["primary", "green", "orange", "blue", "purple", "cyan"] as const;

/** Secuencia pseudoaleatoria determinista: misma entrada, misma salida en
 *  servidor y cliente. */
function seeded(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export default function SuccessState({
  title = "¡Perfecto!",
  message,
  headline,
  detail,
  meta,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: SuccessStateProps) {
  const reduce = useReducedMotion();

  const confetti = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        left: seeded(i) * 100,
        delay: seeded(i + 100) * 0.4,
        drift: (seeded(i + 200) - 0.5) * 40,
        rotate: seeded(i + 300) * 360,
        accent: CONFETTI_ACCENTS[i % CONFETTI_ACCENTS.length],
      })),
    [],
  );

  return (
    <div className="relative flex flex-col items-center py-8 text-center">
      {!reduce && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden">
          {confetti.map((c, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: -24, rotate: 0 }}
              animate={{ opacity: [0, 1, 1, 0], y: 160, x: c.drift, rotate: c.rotate }}
              transition={{ duration: 1.6, delay: c.delay, ease: easing.out }}
              style={{ left: `${c.left}%`, backgroundColor: accents[c.accent] }}
              className="absolute top-0 block size-2 rounded-chip"
            />
          ))}
        </div>
      )}

      <motion.div
        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        className="flex size-24 items-center justify-center rounded-pill"
        style={{
          backgroundColor: hexToRgba(colors.green, 0.12),
          boxShadow: `inset 0 0 0 2px ${hexToRgba(colors.green, 0.5)}`,
        }}
      >
        <Check size={iconSize.xl} strokeWidth={strokeWidth.bold} className="text-green" aria-hidden="true" />
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: duration.page, ease: easing.out, delay: 0.1 }}
        className="mt-6 w-full"
      >
        <h3 className="text-heading font-bold text-text">{title}</h3>
        <p role="status" className="mt-1 text-body text-text-secondary">
          {message}
        </p>

        {headline && (
          <p className="tabular mt-6 text-display font-bold text-text">{headline}</p>
        )}
        {detail && (
          <p className="mx-auto mt-3 inline-flex max-w-full items-center rounded-pill border border-border bg-surface-elevated px-4 py-2 text-body text-text">
            {detail}
          </p>
        )}
        {meta && <p className="tabular mt-3 text-caption text-text-muted">{meta}</p>}
      </motion.div>

      <div className="mt-8 w-full space-y-3">
        <AppButton size="lg" onClick={onPrimary}>
          {primaryLabel}
        </AppButton>
        {secondaryLabel && onSecondary && (
          <AppButton variant="secondary" size="lg" onClick={onSecondary}>
            {secondaryLabel}
          </AppButton>
        )}
      </div>
    </div>
  );
}
