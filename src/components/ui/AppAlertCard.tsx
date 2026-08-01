// Tarjeta de aviso del resumen (mockup 2, sección "Avisos"): icono redondo
// del color de la severidad, título en blanco, motivo en ese mismo color y
// chevron. Toda la tarjeta es el enlace a donde se resuelve el aviso.

import AppCard from "./AppCard";
import AppIcon from "./AppIcon";
import AppIconChip from "./AppIconChip";
import { accents, type AccentToken } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";

export interface AppAlertCardProps {
  icon: IconName;
  accent: AccentToken;
  title: React.ReactNode;
  /** Segunda línea, en el color del acento: "Vence en 15 días". */
  detail?: React.ReactNode;
  href: string;
}

export default function AppAlertCard({
  icon,
  accent,
  title,
  detail,
  href,
}: AppAlertCardProps) {
  return (
    <AppCard href={href}>
      <div className="flex items-center gap-3">
        <AppIconChip icon={icon} accent={accent} shape="circle" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-text">{title}</p>
          {detail && (
            <p className="mt-0.5 truncate text-caption font-medium" style={{ color: accents[accent] }}>
              {detail}
            </p>
          )}
        </div>
        <AppIcon name="chevronRight" className="shrink-0 text-text-muted" />
      </div>
    </AppCard>
  );
}
