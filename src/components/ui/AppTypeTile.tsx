"use client";

// Casilla de la rejilla "¿Qué quieres añadir?" (mockup 3): chip de icono
// arriba a la izquierda y etiqueta debajo. Rejilla de 2 columnas.

import Link from "next/link";
import { motion } from "framer-motion";
import { duration, easing, type AccentToken } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";
import AppIconChip from "./AppIconChip";
import { cn } from "./cn";

export interface AppTypeTileProps {
  icon: IconName;
  label: string;
  accent?: AccentToken;
  onClick?: () => void;
  /** La casilla navega en vez de elegir. Es un enlace de verdad —y no un
   *  onClick con router.push— para que la navegación no dependa de que la
   *  casilla siga montada: la del "Recordatorio" cierra la hoja al pulsarla
   *  y desaparece con ella. */
  href?: string;
  /** Marca la casilla como elegida (rejillas de tipo del asistente, donde
   *  la selección se ve antes de pasar de paso). Cuando se pasa, la casilla
   *  se comporta como un radio y lo anuncia como tal. */
  selected?: boolean;
  /** Versión de tres columnas (accesos rápidos del resumen): menos relleno y
   *  etiqueta pequeña, porque en un móvil de 360px cada casilla tiene menos
   *  de la mitad de ancho que en la rejilla de dos columnas. */
  compact?: boolean;
  className?: string;
}

export default function AppTypeTile({
  icon,
  label,
  accent = "primary",
  onClick,
  href,
  selected,
  compact = false,
  className,
}: AppTypeTileProps) {
  const selectable = selected !== undefined;

  const classes = cn(
    "flex flex-col items-start justify-between rounded-card",
    "border bg-surface-elevated text-left transition-colors",
    compact ? "min-h-20 gap-2 p-3" : "min-h-24 gap-3 p-4",
    selected ? "border-primary" : "border-border hover:border-text-muted",
    className,
  );

  const content = (
    <>
      <AppIconChip icon={icon} accent={accent} size={compact ? "sm" : "md"} />
      <span
        className={cn(
          "w-full font-semibold text-text",
          // En tres columnas una palabra larga ("Mantenimiento") no cabe en
          // una línea a 360px: se parte con guión, que se lee mejor que un
          // recorte con puntos suspensivos.
          compact ? "hyphens-auto text-caption leading-tight" : "truncate text-body",
        )}
      >
        {label}
      </span>
    </>
  );

  const press = {
    whileTap: { scale: 0.97 },
    transition: { duration: duration.press, ease: easing.out },
  };

  if (href) {
    return (
      <motion.span {...press} className="flex">
        <Link href={href} onClick={onClick} className={cn(classes, "flex-1")}>
          {content}
        </Link>
      </motion.span>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      role={selectable ? "radio" : undefined}
      aria-checked={selectable ? selected : undefined}
      {...press}
      className={classes}
    >
      {content}
    </motion.button>
  );
}
