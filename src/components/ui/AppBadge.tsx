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
  /** Píldora neutra: fondo translúcido oscuro y texto claro. Es la del
   *  distintivo de versión bajo el nombre del coche, donde el color no
   *  significa nada y competiría con el estado. */
  tone?: "accent" | "neutral";
  className?: string;
}

export default function AppBadge({
  children,
  accent = "green",
  dot = false,
  solid = false,
  tone = "accent",
  className,
}: AppBadgeProps) {
  const color = accents[accent];
  const neutral = tone === "neutral";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 text-caption font-semibold whitespace-nowrap",
        className,
      )}
      style={{
        borderRadius: radius.pill,
        backgroundColor: neutral
          ? colors.surfaceElevated
          : solid ? color : accentDim(accent, 0.16),
        color: neutral ? colors.text : solid ? colors.textOnColor : color,
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
