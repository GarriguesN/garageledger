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
  /** Importe sin formatear: lo necesitan los totales por mes. */
  rawAmount: number;
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
    rawAmount: row.importe,
    meta: row.km != null ? formatKm(row.km) : undefined,
    icon: category.icon,
    accent: category.accent,
  };
}

/** Agrupa por el encabezado del timeline, conservando el orden de entrada
 *  (ya viene descendente). Se usa un Map porque preserva el orden de
 *  inserción; un objeto no lo garantiza con claves que parecen números.
 *
 *  Se agrupa por ETIQUETA y no por fecha exacta a propósito: `relativeDayLabel`
 *  mete varios días en el mismo cajón ("Hace 1 semana" cubre del 7 al 13, y
 *  todo lo que no es pasado cae en "Hoy"). Agrupando por día salían dos
 *  secciones seguidas con el mismo título —y con la misma key de React, que
 *  es lo que avisaba la consola. */
export function groupByDay(rows: ExpenseView[]): { label: string; date: string; entries: ExpenseView[] }[] {
  const groups = new Map<string, { date: string; entries: ExpenseView[] }>();
  for (const row of rows) {
    const day = row.date.slice(0, 10);
    const label = relativeDayLabel(day);
    const hit = groups.get(label);
    // `date` es la del primer gasto del grupo: al venir ordenado, es la más
    // reciente de las que comparten encabezado.
    if (hit) hit.entries.push(row);
    else groups.set(label, { date: day, entries: [row] });
  }
  return [...groups.entries()].map(([label, { date, entries }]) => ({
    date,
    label,
    entries,
  }));
}

/** Agrupa por mes natural para el historial de gastos, con el total de cada
 *  mes. A diferencia del timeline de Actividad —que agrupa por día porque se
 *  lee como un diario—, el historial se consulta para cuadrar cuentas, y ahí
 *  la unidad es el mes. */
export function groupByMonth(
  rows: ExpenseView[],
): { month: string; total: number; entries: ExpenseView[] }[] {
  const groups = new Map<string, { total: number; entries: ExpenseView[] }>();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    const hit = groups.get(month);
    if (hit) {
      hit.entries.push(row);
      hit.total += row.rawAmount;
    } else {
      groups.set(month, { total: row.rawAmount, entries: [row] });
    }
  }
  return [...groups.entries()].map(([month, { total, entries }]) => ({ month, total, entries }));
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
