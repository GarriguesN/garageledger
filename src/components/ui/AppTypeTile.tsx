"use client";

// Casilla de la rejilla "¿Qué quieres añadir?" (mockup 3): chip de icono
// arriba a la izquierda y etiqueta debajo. Rejilla de 2 columnas.

import { motion } from "framer-motion";
import { duration, easing, type AccentToken } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";
import AppIconChip from "./AppIconChip";
import { cn } from "./cn";

export interface AppTypeTileProps {
  icon: IconName;
  label: string;
  accent?: AccentToken;
  onClick: () => void;
  className?: string;
}

export default function AppTypeTile({
  icon,
  label,
  accent = "primary",
  onClick,
  className,
}: AppTypeTileProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: duration.press, ease: easing.out }}
      className={cn(
        "flex min-h-24 flex-col items-start justify-between gap-3 rounded-card",
        "border border-border bg-surface-elevated p-4 text-left transition-colors",
        "hover:border-text-muted",
        className,
      )}
    >
      <AppIconChip icon={icon} accent={accent} />
      <span className="text-body font-semibold text-text">{label}</span>
    </motion.button>
  );
}
