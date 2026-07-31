// Bloque de resumen que muestra el mockup en el último paso de cada wizard
// (pantallas 4, 10, 14, 17):
//
//   ┌────────────────────────────────────────┐
//   │  Resumen del repostaje          [Editar]│  ← header de la card
//   │  ──────────────────────────────────────│
//   │  Importe total               53,00 €   │  ← fila
//   │  Precio por litro            1,325 €/L  │
//   │  Kilometraje            132.870 km      │
//   │  Depósito                  Lleno       │
//   └────────────────────────────────────────┘
//
// La API es minimal:
//   · `title`        → cabecera de la card.
//   · `items`        → filas clave/valor. El valor puede ser string o ReactNode.
//   · `onEdit`       → botón "Editar" de la cabecera. Si no, no se muestra.
//   · `footer`       → slot opcional (ej. total destacado).
//
// No se hace un mapping de iconos por fila: las filas del mockup son
// siempre label + valor, sin icono. Si en algún wizard hace falta, se
// puede extender.

import { Pencil } from "@/design/tokens/icons";
import { cn } from "./cn";

export interface WizardSummaryItem {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Resalta la fila (ej. un total). */
  emphasis?: boolean;
}

export interface WizardSummaryCardProps {
  title: string;
  items: WizardSummaryItem[];
  onEdit?: () => void;
  footer?: React.ReactNode;
  className?: string;
}

export default function WizardSummaryCard({
  title,
  items,
  onEdit,
  footer,
  className,
}: WizardSummaryCardProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-card border border-border bg-surface",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h3 className="text-title font-semibold text-text">{title}</h3>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-caption font-semibold text-primary"
          >
            <Pencil size={14} strokeWidth={2} />
            Editar
          </button>
        )}
      </header>
      <dl className="divide-y divide-border">
        {items.map((item, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start justify-between gap-3 px-4 py-3 text-body",
              item.emphasis && "bg-surface-elevated",
            )}
          >
            <dt className="text-text-secondary">{item.label}</dt>
            <dd className="text-right font-medium text-text">{item.value}</dd>
          </div>
        ))}
      </dl>
      {footer && <div className="border-t border-border px-4 py-3">{footer}</div>}
    </section>
  );
}
