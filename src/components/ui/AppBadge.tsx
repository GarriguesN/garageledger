// Píldora de estado. Dos formas en el mockup:
//   · con punto  → estado del vehículo ("Excelente", "Regular")
//   · sin punto  → estado de un documento ("Vigente", "OK", "Próximo")
// El color siempre viene de un acento, nunca de un hex suelto.

import { colors, accents, accentDim, radius, type AccentToken } from "@/design/tokens";
import { cn } from "./cn";

export interface AppBadgeProps {
  children: React.ReactNode;
  accent?: AccentToken;
  /** Punto de color a la izquierda del texto. */
  dot?: boolean;
  /** Fondo sólido en vez del acento tenue. */
  solid?: boolean;
  className?: string;
}

export default function AppBadge({
  children,
  accent = "green",
  dot = false,
  solid = false,
  className,
}: AppBadgeProps) {
  const color = accents[accent];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 text-caption font-semibold whitespace-nowrap",
        className,
      )}
      style={{
        borderRadius: radius.pill,
        backgroundColor: solid ? color : accentDim(accent, 0.16),
        color: solid ? colors.textOnColor : color,
      }}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: solid ? colors.textOnColor : color }}
        />
      )}
      {children}
    </span>
  );
}
