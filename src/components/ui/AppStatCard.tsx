// Tarjeta de estadística de Insights (mockup 12): etiqueta, cifra grande,
// unidad y una línea de comparación con flecha.
//
// Convenio de la flecha: `deltaGood` decide el color, no el signo. Bajar el
// consumo es bueno y bajar los km del mes no significa nada; que lo decida
// quien conoce la métrica evita pintar de verde una mala noticia.

import { ArrowDownRight, ArrowUpRight } from "@/design/tokens/icons";
import { colors, iconSize, strokeWidth, type AccentToken } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";
import AppCard from "./AppCard";
import AppIconChip from "./AppIconChip";
import { cn } from "./cn";

export interface AppStatCardProps {
  label: string;
  value: React.ReactNode;
  /** Chip de icono sobre la etiqueta. Identifica la métrica de un vistazo
   *  cuando hay varias tarjetas en rejilla. */
  icon?: IconName;
  accent?: AccentToken;
  /** Convierte la tarjeta en enlace a la pantalla que desarrolla el dato. */
  href?: string;
  /** Unidad pequeña bajo la cifra ("L/100km", "€"). */
  unit?: React.ReactNode;
  /** Texto de comparación ("0.7 vs media"). */
  delta?: React.ReactNode;
  /** Dirección de la flecha. */
  deltaDirection?: "up" | "down";
  /** ¿La variación es buena? Verde si sí, rojo si no, gris si se omite. */
  deltaGood?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export default function AppStatCard({
  label,
  value,
  icon,
  accent = "primary",
  href,
  unit,
  delta,
  deltaDirection = "down",
  deltaGood,
  children,
  className,
}: AppStatCardProps) {
  const Arrow = deltaDirection === "up" ? ArrowUpRight : ArrowDownRight;
  const deltaColor =
    deltaGood === undefined ? colors.textSecondary : deltaGood ? colors.green : colors.danger;

  return (
    <AppCard href={href} className={cn("flex flex-col", className)}>
      {icon && <AppIconChip icon={icon} accent={accent} size="sm" className="mb-3" />}
      <span className="text-caption font-medium text-text-secondary">{label}</span>
      <span className="tabular mt-1 text-display font-bold leading-none text-text">{value}</span>
      {unit && <span className="mt-1 text-caption text-text-secondary">{unit}</span>}
      {delta && (
        <span className="mt-2 inline-flex items-center gap-1 text-caption" style={{ color: deltaColor }}>
          <Arrow size={iconSize.xs} strokeWidth={strokeWidth.bold} aria-hidden="true" />
          {delta}
        </span>
      )}
      {children}
    </AppCard>
  );
}
