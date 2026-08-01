"use client";

// Chips de filtro: "Todos", "Combustible", "Mantenimiento"…
//
// Selección múltiple. "Todos" no es un filtro más sino la ausencia de
// filtros: al tocarlo se vacía la selección, y se enciende solo cuando no
// hay ninguno activo. Sin esa regla acaba habiendo dos formas de decir lo
// mismo ("todos" marcado + tres categorías marcadas).
//
// La fila hace scroll horizontal en móvil en vez de partirse en varias
// líneas: así la altura de la pantalla no baila al filtrar.

import { motion } from "framer-motion";
import { duration, easing } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";
import AppIcon from "./AppIcon";
import { cn } from "./cn";

export interface FilterChip {
  id: string;
  label: string;
  icon?: IconName;
}

export interface AppChipFilterProps {
  chips: FilterChip[];
  /** Ids activos. Vacío = "Todos". */
  selected: string[];
  onChange: (selected: string[]) => void;
  allLabel?: string;
  className?: string;
}

export default function AppChipFilter({
  chips, selected, onChange, allLabel = "Todos", className,
}: AppChipFilterProps) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div
      role="group"
      aria-label="Filtrar por categoría"
      className={cn("-mx-4 flex gap-2 overflow-x-auto px-4 pb-1", className)}
    >
      <Chip label={allLabel} active={selected.length === 0} onClick={() => onChange([])} />
      {chips.map((chip) => (
        <Chip
          key={chip.id}
          label={chip.label}
          icon={chip.icon}
          active={selected.includes(chip.id)}
          onClick={() => toggle(chip.id)}
        />
      ))}
    </div>
  );
}

function Chip({
  label, icon, active, onClick,
}: {
  label: string;
  icon?: IconName;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={active}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: duration.press, ease: easing.out }}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-pill border px-4",
        "text-caption font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-white"
          : "border-border bg-surface-elevated text-text-secondary hover:text-text",
      )}
    >
      {icon && <AppIcon name={icon} size="sm" />}
      {label}
    </motion.button>
  );
}
