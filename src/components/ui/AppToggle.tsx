"use client";

// Interruptor del mockup (pasos "Establecer como predeterminado" y
// "Recordarme"): fila con etiqueta a la izquierda y switch a la derecha.
//
// Es un <button role="switch"> y no un checkbox pintado: así el lector de
// pantalla anuncia el estado y la tecla espacio lo alterna sin código extra.
// La fila entera es el objetivo táctil (44px de alto), no solo el switch.

import { motion } from "framer-motion";
import { duration, easing } from "@/design/tokens";
import { cn } from "./cn";

export interface AppToggleProps {
  label: React.ReactNode;
  /** Texto pequeño bajo la etiqueta. */
  hint?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export default function AppToggle({
  label, hint, checked, onChange, disabled = false, className,
}: AppToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex min-h-12 w-full items-center justify-between gap-4 text-left",
        disabled && "opacity-50",
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block text-body font-medium text-text">{label}</span>
        {hint && <span className="mt-0.5 block text-caption text-text-muted">{hint}</span>}
      </span>

      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill transition-colors",
          checked ? "bg-primary" : "bg-surface-elevated border border-border",
        )}
      >
        <motion.span
          layout
          transition={{ duration: duration.press, ease: easing.out }}
          className={cn(
            "block size-5 rounded-pill bg-white",
            checked ? "ml-auto mr-1" : "ml-1",
          )}
        />
      </span>
    </button>
  );
}
