// Estado vacío: icono tenue, título, explicación y una acción.
// El mockup no dibuja ninguno (siempre muestra datos), así que su diseño se
// deriva del sistema: chip de icono grande + jerarquía título/cuerpo.

import AppIconChip from "./AppIconChip";
import AppButton from "./AppButton";
import type { AccentToken } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";
import { cn } from "./cn";

export interface AppEmptyStateProps {
  icon: IconName;
  title: string;
  description?: React.ReactNode;
  accent?: AccentToken;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export default function AppEmptyState({
  icon,
  title,
  description,
  accent = "primary",
  actionLabel,
  actionHref,
  onAction,
  className,
}: AppEmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-12 text-center", className)}>
      <AppIconChip icon={icon} accent={accent} size="lg" />
      <h3 className="mt-4 text-title font-semibold text-text">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xs text-body text-text-secondary">{description}</p>
      )}
      {actionLabel && (
        <AppButton className="mt-6" href={actionHref} onClick={onAction}>
          {actionLabel}
        </AppButton>
      )}
    </div>
  );
}
