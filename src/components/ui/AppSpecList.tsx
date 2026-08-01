// "Información del vehículo" (mockup 2): una tarjeta con la ficha técnica a
// dos columnas —etiqueta a la izquierda, dato a la derecha— y un enlace al
// final para ver el resto.
//
// Las filas sin dato no se pintan: un "—" repetido siete veces no informa de
// nada y ensucia una tarjeta que debe leerse de un vistazo.

import Link from "next/link";
import AppCard from "./AppCard";
import AppIcon from "./AppIcon";

export interface SpecRow {
  label: string;
  value: React.ReactNode;
}

export interface AppSpecListProps {
  rows: SpecRow[];
  /** Pie de la tarjeta: "Ver más detalles". Navega con `actionHref` o abre
   *  algo en el sitio con `onAction` (la ficha completa sube en una hoja). */
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

// Mismo tamaño y color que la acción de una sección ("Ver calendario"): es
// el mismo gesto, solo que al pie de una tarjeta.
const ACTION_CLASSES =
  "mt-4 flex min-h-11 w-full items-center justify-between border-t border-border pt-3 text-caption font-semibold text-primary";

export default function AppSpecList({
  rows,
  actionLabel,
  actionHref,
  onAction,
}: AppSpecListProps) {
  return (
    <AppCard>
      <dl className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4">
            <dt className="shrink-0 text-body text-text-secondary">{row.label}</dt>
            <dd className="truncate text-body font-medium text-text">{row.value}</dd>
          </div>
        ))}
      </dl>

      {actionLabel && actionHref && (
        <Link href={actionHref} className={ACTION_CLASSES}>
          {actionLabel}
          <AppIcon name="chevronRight" size="sm" />
        </Link>
      )}

      {actionLabel && !actionHref && onAction && (
        <button type="button" onClick={onAction} className={ACTION_CLASSES}>
          {actionLabel}
          <AppIcon name="chevronRight" size="sm" />
        </button>
      )}
    </AppCard>
  );
}
