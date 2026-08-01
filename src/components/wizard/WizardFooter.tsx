"use client";

// Barra fija al pie. Nunca se va con el scroll: los botones de un asistente
// tienen que estar donde el pulgar los espera, sin buscarlos al final de la
// página.
//
// El borde superior separa la barra del contenido que pasa por debajo, y el
// safe-area evita que el botón quede bajo la barra de gestos del móvil.

import { cn } from "@/components/ui/cn";

export interface WizardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export default function WizardFooter({ children, className }: WizardFooterProps) {
  return (
    <div
      className={cn(
        "safe-bottom shrink-0 border-t border-border bg-surface px-4 py-3",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-2xl">{children}</div>
    </div>
  );
}
