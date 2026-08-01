// Bloque con título y acción opcional a la derecha ("Mis vehículos",
// "Evolución de gastos", "Historial"…). El título es un h2 real para que el
// lector de pantalla pueda saltar entre secciones.

import Link from "next/link";
import AppIcon from "./AppIcon";
import { cn } from "./cn";

export interface AppSectionProps {
  title?: React.ReactNode;
  /** Control a la derecha del título: enlace "Ver todos", selector de rango… */
  action?: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  children: React.ReactNode;
  className?: string;
}

export default function AppSection({
  title,
  action,
  actionLabel,
  actionHref,
  onAction,
  children,
  className,
}: AppSectionProps) {
  const trailing =
    action ??
    (actionLabel ? (
      actionHref ? (
        <Link href={actionHref} className="text-caption font-semibold text-primary">
          {actionLabel}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex min-h-11 items-center gap-0.5 text-caption font-semibold text-primary"
        >
          {actionLabel}
          {/* La acción que abre algo aquí mismo lleva chevron; la que navega
              no lo necesita, ya se sabe que cambia de pantalla. */}
          <AppIcon name="chevronRight" size="sm" />
        </button>
      )
    ) : null);

  return (
    <section className={cn("space-y-3", className)}>
      {(title || trailing) && (
        <div className="flex items-center justify-between gap-3">
          {title && <h2 className="text-title font-semibold text-text">{title}</h2>}
          {trailing}
        </div>
      )}
      {children}
    </section>
  );
}
