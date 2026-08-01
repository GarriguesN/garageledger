"use client";

// Cabecera del asistente: ← a la izquierda, título centrado y ✕ a la
// derecha. Igual en todos los asistentes y en todos los pasos, para que la
// salida esté siempre en el mismo sitio.
//
// En el primer paso la flecha se desactiva en lugar de desaparecer: si el
// botón bailara de posición, el pulgar tendría que buscarlo cada vez.

import { X, ArrowLeft } from "@/design/tokens/icons";
import { iconSize, strokeWidth } from "@/design/tokens";
import { cn } from "@/components/ui/cn";

export interface WizardHeaderProps {
  title: string;
  onBack?: () => void;
  onClose: () => void;
}

export default function WizardHeader({ title, onBack, onClose }: WizardHeaderProps) {
  return (
    <header className="safe-top flex min-h-14 shrink-0 items-center gap-1 px-2">
      <button
        type="button"
        onClick={onBack}
        disabled={!onBack}
        aria-label="Atrás"
        className={cn(
          "inline-flex size-11 items-center justify-center text-text",
          !onBack && "invisible",
        )}
      >
        <ArrowLeft size={iconSize.lg} strokeWidth={strokeWidth.default} aria-hidden="true" />
      </button>

      <h2 className="min-w-0 flex-1 truncate text-center text-title font-bold text-text">
        {title}
      </h2>

      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="inline-flex size-11 items-center justify-center text-text"
      >
        <X size={iconSize.lg} strokeWidth={strokeWidth.default} aria-hidden="true" />
      </button>
    </header>
  );
}
