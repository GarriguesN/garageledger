"use client";

// Pantalla de éxito común a todos los wizards (mockup 18).
//
//   ┌─────────────────────────────────────┐
//   │           confetti (16 partículas)  │
//   │                                     │
//   │             ◯                          │
//   │             ✓                          │  ← check verde
//   │                                     │
//   │            ¡Perfecto!               │
//   │     Gasto guardado correctamente    │
//   │              53,00 €                │
//   │    Lavado exterior + aspirado · …   │
//   │                                     │
//   │   [ Ver en actividad    ] ← rojo    │
//   │   [ Añadir otro gasto   ] ← outline │
//   └─────────────────────────────────────┘
//
// El confetti son partículas CSS absolutas con keyframes; no requiere
// ninguna librería y respeta `prefers-reduced-motion` (las partículas
// dejan de animarse y aparecen solo en su posición final).

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "@/design/tokens/icons";
import { colors, duration, easing } from "@/design/tokens";
import { cn } from "./cn";

const CONFETTI_COLORS = [
  colors.primary,
  colors.green,
  colors.orange,
  colors.blue,
  colors.purple,
  colors.cyan,
];

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  color: string;
  rotate: number;
  size: number;
}

function buildConfetti(count: number): ConfettiPiece[] {
  // Determinista en SSR (mismo orden, mismas posiciones) para que el
  // HTML pre-renderizado no produzca mismatch en hidratación.
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: ((i * 47) % 100) + (i % 2 === 0 ? -2 : 2),
    delay: (i % 6) * 0.05,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    rotate: (i * 53) % 360,
    size: 6 + (i % 3) * 2,
  }));
}

export interface SuccessScreenProps {
  title?: string;
  /** Línea principal bajo el título (ej. "Gasto guardado correctamente"). */
  subtitle?: React.ReactNode;
  /** Línea destacada de cifra (ej. "53,00 €"). */
  highlight?: React.ReactNode;
  /** Detalle secundario (descripción + fecha). */
  detail?: React.ReactNode;
  primaryAction: { label: string; onClick?: () => void; href?: string };
  secondaryAction?: { label: string; onClick?: () => void; href?: string };
  className?: string;
}

export default function SuccessScreen({
  title = "¡Perfecto!",
  subtitle,
  highlight,
  detail,
  primaryAction,
  secondaryAction,
  className,
}: SuccessScreenProps) {
  const reduce = useReducedMotion();
  const [pieces, setPieces] = useState<ConfettiPiece[]>(() => buildConfetti(16));

  // Re-roll al montar para que la primera apertura no muestre siempre
  // la misma distribución. Cliente-only.
  useEffect(() => {
    setPieces(buildConfetti(16));
  }, []);

  return (
    <div
      className={cn(
        "relative flex min-h-full flex-col items-center justify-center px-6 py-10 text-center",
        className,
      )}
    >
      {/* Confetti. Bolitas pequeñas en posiciones fijas, sin motion JS. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {pieces.map((p) => (
          <span
            key={p.id}
            className={cn(
              "absolute block rounded-pill",
              !reduce && "confetti-piece",
            )}
            style={{
              left: `${p.x}%`,
              top: "-12px",
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
              transform: `rotate(${p.rotate}deg)`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: duration.ring, ease: easing.out }}
        className="relative flex size-28 items-center justify-center rounded-full"
        style={{ backgroundColor: `${colors.green}1F` }}
      >
        <motion.div
          initial={reduce ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: duration.page,
            ease: easing.out,
            delay: reduce ? 0 : 0.15,
          }}
          className="flex size-16 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.green }}
        >
          <Check
            size={36}
            strokeWidth={3}
            color={colors.textOnColor}
            aria-hidden="true"
          />
        </motion.div>
      </motion.div>

      <h2 className="mt-6 text-display font-bold text-text">{title}</h2>
      {subtitle && (
        <p className="mt-1 text-body text-text-secondary">{subtitle}</p>
      )}
      {highlight && (
        <p className="mt-4 text-display font-bold text-text">{highlight}</p>
      )}
      {detail && (
        <p className="mt-1 text-body text-text-secondary">{detail}</p>
      )}

      <div className="mt-10 flex w-full flex-col gap-3">
        <SuccessAction variant="primary" {...primaryAction} />
        {secondaryAction && (
          <SuccessAction variant="secondary" {...secondaryAction} />
        )}
      </div>
    </div>
  );
}

function SuccessAction({
  variant,
  label,
  onClick,
  href,
}: {
  variant: "primary" | "secondary";
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const base = "min-h-12 rounded-button px-6 text-body font-semibold transition-colors";
  const styles =
    variant === "primary"
      ? "bg-primary text-white hover:bg-primary-hover"
      : "border border-border bg-surface-elevated text-text hover:border-text-muted";
  if (href) {
    return (
      <a href={href} onClick={onClick} className={cn(base, styles, "inline-flex items-center justify-center")}>
        {label}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cn(base, styles)}>
      {label}
    </button>
  );
}
