"use client";

// Último paso de todos los asistentes: repasar antes de guardar.
//
// Cada grupo es una tarjeta con sus filas etiqueta/valor y un enlace
// "Editar" que devuelve al paso donde se rellenó. Volver desde aquí no
// pierde nada: el asistente guarda un único objeto de valores y los pasos
// solo lo leen.
//
// Las filas vacías no se pintan: un resumen lleno de guiones no es un
// resumen, es ruido.

import AppIconChip from "@/components/ui/AppIconChip";
import { cn } from "@/components/ui/cn";
import type { IconName } from "@/design/tokens/icons";
import type { AccentToken } from "@/design/tokens";

export interface SummaryRow {
  label: string;
  value: React.ReactNode;
  /** Destaca el valor (importe total del repostaje). */
  emphasis?: boolean;
}

export interface SummaryGroup {
  /** Cabecera opcional de la tarjeta. */
  icon?: IconName;
  accent?: AccentToken;
  title?: string;
  subtitle?: string;
  rows: SummaryRow[];
  /** Id del paso al que lleva "Editar". */
  editStepId?: string;
}

export interface SummaryStepProps {
  groups: SummaryGroup[];
  onEdit?: (stepId: string) => void;
}

function isEmpty(value: React.ReactNode): boolean {
  return value == null || value === "" || value === "—";
}

export default function SummaryStep({ groups, onEdit }: SummaryStepProps) {
  return (
    <div className="space-y-3">
      {groups.map((group, i) => {
        const rows = group.rows.filter((r) => !isEmpty(r.value));
        if (rows.length === 0 && !group.title) return null;

        return (
          <div key={group.title ?? i} className="rounded-card border border-border bg-surface-elevated p-4">
            {(group.title || group.editStepId) && (
              <div className="flex items-center gap-3">
                {group.icon && <AppIconChip icon={group.icon} accent={group.accent ?? "primary"} />}
                <div className="min-w-0 flex-1">
                  {group.title && (
                    <p className="truncate text-body font-semibold text-text">{group.title}</p>
                  )}
                  {group.subtitle && (
                    <p className="mt-0.5 truncate text-caption text-text-secondary">{group.subtitle}</p>
                  )}
                </div>
                {group.editStepId && onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(group.editStepId!)}
                    className="inline-flex min-h-11 shrink-0 items-center px-2 text-caption font-semibold text-primary"
                  >
                    Editar
                  </button>
                )}
              </div>
            )}

            {rows.length > 0 && (
              <dl className={cn("space-y-3", (group.title || group.editStepId) && "mt-4")}>
                {rows.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-4">
                    <dt className="text-caption text-text-secondary">{row.label}</dt>
                    <dd
                      className={cn(
                        "tabular min-w-0 text-right text-body text-text",
                        row.emphasis && "font-bold",
                      )}
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        );
      })}
    </div>
  );
}
