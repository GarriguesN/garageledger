// El cuadrado redondeado de icono que precede a casi toda fila del mockup:
// mantenimientos, documentos, gastos, entradas del timeline y métricas.
// Fondo = acento al 12%, icono = acento a plena saturación.

import { colors, accents, accentDim, iconSize, radius, type AccentToken } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";
import AppIcon from "./AppIcon";
import { cn } from "./cn";

const SIZES = {
  sm: { box: 32, icon: iconSize.sm },
  md: { box: 40, icon: iconSize.md },
  lg: { box: 48, icon: iconSize.lg },
} as const;

export interface AppIconChipProps {
  icon: IconName;
  accent?: AccentToken;
  size?: keyof typeof SIZES;
  /** Rellena el chip con el acento sólido en vez del 12%. */
  solid?: boolean;
  className?: string;
}

export default function AppIconChip({
  icon,
  accent = "primary",
  size = "md",
  solid = false,
  className,
}: AppIconChipProps) {
  const { box, icon: iconPx } = SIZES[size];
  const color = accents[accent];

  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      style={{
        width: box,
        height: box,
        borderRadius: radius.chip,
        backgroundColor: solid ? color : accentDim(accent),
      }}
    >
      <AppIcon name={icon} size={iconPx} color={solid ? colors.textOnColor : color} />
    </span>
  );
}
