// Casilla de la rejilla "Estadísticas" del resumen (mockup 2): icono redondo
// centrado, cifra grande con su unidad al lado y etiqueta debajo. Sin
// gráficas ni tendencias — eso es Insights.
//
// Es prima de AppStatCard, que es la de Insights: allí la etiqueta va arriba
// y hay comparación con la media. Aquí manda la cifra.

import type { AccentToken } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";
import AppCard from "./AppCard";
import AppIcon from "./AppIcon";
import AppIconChip from "./AppIconChip";

export interface AppStatTileProps {
  icon: IconName;
  accent?: AccentToken;
  /** Cifra protagonista: "245.000", "12.450 €". */
  value: React.ReactNode;
  /** Unidad junto a la cifra: "km", "L/100km". */
  unit?: React.ReactNode;
  /** Qué es: "Kilometraje total". */
  label: React.ReactNode;
  href?: string;
}

export default function AppStatTile({
  icon,
  accent = "primary",
  value,
  unit,
  label,
  href,
}: AppStatTileProps) {
  return (
    <AppCard href={href} className="relative flex flex-col items-center text-center">
      {/* Si la casilla lleva a otra pantalla, se dice: un chevron en la
          esquina, como en cualquier fila navegable de la app. Sin él, una
          tarjeta centrada no parece pulsable. */}
      {href && (
        <AppIcon name="chevronRight" size="sm" className="absolute right-3 top-3 text-text-muted" />
      )}
      <AppIconChip icon={icon} accent={accent} size="lg" shape="circle" />
      <p className="mt-3 flex items-baseline justify-center gap-1">
        <span className="tabular text-display font-bold leading-none text-text">{value}</span>
        {unit && <span className="text-body font-medium text-text-secondary">{unit}</span>}
      </p>
      <p className="mt-2 text-caption text-text-secondary">{label}</p>
    </AppCard>
  );
}
