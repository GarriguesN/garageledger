"use client";

// Control segmentado del mockup: "Km / Tiempo" (paso de próximo
// mantenimiento) y "Taller / DIY" (paso de detalles del servicio).
//
// Dos o tres opciones excluyentes, siempre visibles: cuando el conjunto es
// pequeño, enseñar las alternativas es más rápido que abrir un desplegable
// y no oculta información detrás de un toque.
//
// Semántica de radiogroup: las flechas del teclado mueven la selección,
// igual que un grupo de radios nativo.

import { motion } from "framer-motion";
import { duration, easing } from "@/design/tokens";
import { cn } from "./cn";

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
}

export interface AppSegmentedProps<T extends string = string> {
  label?: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export default function AppSegmented<T extends string = string>({
  label, options, value, onChange, className,
}: AppSegmentedProps<T>) {
  function move(delta: number) {
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + delta + options.length) % options.length];
    if (next) onChange(next.value);
  }

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <span className="mb-2 block text-caption font-medium text-text-secondary">{label}</span>
      )}
      <div
        role="radiogroup"
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); move(1); }
          if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); move(-1); }
        }}
        className="flex gap-1 rounded-input border border-border bg-surface-elevated p-1"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <motion.button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: duration.press, ease: easing.out }}
              onClick={() => onChange(o.value)}
              className={cn(
                "min-h-11 flex-1 rounded-chip px-3 text-body font-semibold transition-colors",
                active ? "bg-primary text-white" : "text-text-secondary hover:text-text",
              )}
            >
              {o.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
