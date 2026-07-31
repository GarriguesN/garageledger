// Métrica compacta: icono + etiqueta arriba, valor debajo. Es la fila de
// pastillas de la tarjeta del garaje (Salud 94/100, Gasto/mes 182 €,
// Consumo 6.3 L/100km) y la tira inferior del resumen del vehículo.

import { accents, iconSize, strokeWidth, type AccentToken } from "@/design/tokens";
import type { LucideIcon } from "@/design/tokens/icons";
import { cn } from "./cn";

export interface AppMetricProps {
  icon?: LucideIcon;
  label: string;
  value: React.ReactNode;
  accent?: AccentToken;
  /** Línea de tendencia bajo el valor ("▲ 12% vs mes anterior"). */
  hint?: React.ReactNode;
  /** Caja con fondo propio; sin ella la métrica es solo texto. */
  boxed?: boolean;
  className?: string;
}

export default function AppMetric({
  icon: Icon,
  label,
  value,
  accent = "primary",
  hint,
  boxed = true,
  className,
}: AppMetricProps) {
  const color = accents[accent];

  return (
    <div
      className={cn(
        "min-w-0",
        boxed && "rounded-chip border border-border bg-surface-elevated p-3",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        {Icon && (
          <Icon
            size={iconSize.xs}
            strokeWidth={strokeWidth.default}
            color={color}
            aria-hidden="true"
            className="shrink-0"
          />
        )}
        <span className="truncate text-caption font-medium text-text-secondary">{label}</span>
      </div>
      <div className="tabular mt-1 truncate text-body font-bold" style={{ color }}>
        {value}
      </div>
      {hint && <div className="mt-0.5 truncate text-caption">{hint}</div>}
    </div>
  );
}
