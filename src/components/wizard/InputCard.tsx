"use client";

// Tarjeta que agrupa controles relacionados dentro de un paso: el bloque de
// "Recordarme" con su interruptor y su antelación, o el resumen de un
// repostaje. Mismo radio, mismo borde y mismo relleno que las tarjetas del
// resto de la app.

import { cn } from "@/components/ui/cn";
import AppIconChip from "@/components/ui/AppIconChip";
import type { IconName } from "@/design/tokens/icons";
import type { AccentToken } from "@/design/tokens";

export interface InputCardProps {
  /** Cabecera opcional con chip de icono, título y línea de apoyo. */
  icon?: IconName;
  accent?: AccentToken;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export default function InputCard({
  icon, accent = "primary", title, subtitle, children, className,
}: InputCardProps) {
  return (
    <div className={cn("rounded-card border border-border bg-surface-elevated p-4", className)}>
      {(icon || title) && (
        <div className="flex items-center gap-3">
          {icon && <AppIconChip icon={icon} accent={accent} />}
          <div className="min-w-0 flex-1">
            {title && <p className="truncate text-body font-semibold text-text">{title}</p>}
            {subtitle && <p className="mt-0.5 truncate text-caption text-text-secondary">{subtitle}</p>}
          </div>
        </div>
      )}
      {children && <div className={cn(icon || title ? "mt-4" : "", "space-y-4")}>{children}</div>}
    </div>
  );
}
