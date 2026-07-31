// Traducción de un gasto de la BD a lo que pintan el timeline (pantalla 6) y
// el historial de gastos (pantalla 5).

import { resolveCategory } from "@/lib/expenses/categories";
import type { AccentToken } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";
import {
  formatCurrency, formatKm, formatLiters, relativeDayLabel,
} from "@/lib/format";

/** Fila del timeline tal y como llega de getTimeline(). */
export interface TimelineRow {
  id: number;
  date: string;
  tipo: string;
  tipo_id: string | null;
  importe: number;
  descripcion: string;
  referencia: string;
  litros: number | null;
  km: number | null;
}

export interface ExpenseView {
  id: number;
  date: string;
  title: string;
  description?: string;
  amount: string;
  meta?: string;
  icon: IconName;
  accent: AccentToken;
}

export function toExpenseView(row: TimelineRow): ExpenseView {
  const category = resolveCategory(row.tipo_id, row.tipo);

  // La descripción se compone con lo que aporte información y sin repetir el
  // título: en un repostaje, "40 L · Repsol"; en el resto, lo que escribiera
  // el usuario o la referencia.
  const parts: string[] = [];
  if (row.litros != null) parts.push(formatLiters(row.litros));
  if (row.referencia) parts.push(row.referencia);
  if (parts.length === 0 && row.descripcion) parts.push(row.descripcion);

  return {
    id: row.id,
    date: row.date,
    title: category.label,
    description: parts.join(" · ") || undefined,
    amount: formatCurrency(row.importe),
    meta: row.km != null ? formatKm(row.km) : undefined,
    icon: category.icon,
    accent: category.accent,
  };
}

/** Agrupa por día conservando el orden de entrada (ya viene descendente).
 *  Se usa un Map porque preserva el orden de inserción; un objeto no lo
 *  garantiza con claves que parecen números. */
export function groupByDay(rows: ExpenseView[]): { label: string; date: string; entries: ExpenseView[] }[] {
  const groups = new Map<string, ExpenseView[]>();
  for (const row of rows) {
    const day = row.date.slice(0, 10);
    const list = groups.get(day);
    if (list) list.push(row);
    else groups.set(day, [row]);
  }
  return [...groups.entries()].map(([date, entries]) => ({
    date,
    label: relativeDayLabel(date),
    entries,
  }));
}

/** Reparto por categoría para el donut de la pantalla 5. Devuelve los
 *  importes de mayor a menor; las categorías sin gasto no aparecen. */
export function spendByCategory(
  rows: TimelineRow[],
): { id: string; label: string; value: number; accent: AccentToken; share: number }[] {
  const totals = new Map<string, { label: string; accent: AccentToken; value: number }>();
  let total = 0;

  for (const row of rows) {
    const c = resolveCategory(row.tipo_id, row.tipo);
    total += row.importe;
    const hit = totals.get(c.id);
    if (hit) hit.value += row.importe;
    else totals.set(c.id, { label: c.shortLabel, accent: c.accent, value: row.importe });
  }

  return [...totals.entries()]
    .map(([id, v]) => ({
      id,
      label: v.label,
      value: Math.round(v.value * 100) / 100,
      accent: v.accent,
      share: total > 0 ? Math.round((v.value / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);
}
