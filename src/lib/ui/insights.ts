// Las frases de la sección "Para ti" de Insights.
//
// Son observaciones derivadas de datos que ya existen, no consejos genéricos:
// si no hay repostajes suficientes no se habla de consumo, y si no hay
// mantenimiento programado no se inventa uno. Cada tarjeta lleva a la
// pantalla donde se actúa sobre lo que cuenta.
//
// Es una función pura: recibe lo ya calculado y devuelve texto. Así la
// pantalla decide qué consultar y esto solo decide qué merece contarse.

import type { IconName } from "@/design/tokens/icons";
import type { AccentToken } from "@/design/tokens";
import { formatCurrency, formatKm } from "@/lib/format";

export interface InsightCard {
  id: string;
  icon: IconName;
  accent: AccentToken;
  title: string;
  description: string;
  /** Acción opcional; sin ella la tarjeta solo informa. */
  href?: string;
  cta?: string;
}

export interface InsightInput {
  carId: number;
  /** Gasto de este mes y del anterior. */
  monthly: { current: number; previous: number };
  /** Consumo medio histórico y el de los últimos repostajes. */
  averageFuel: number | null;
  recentFuel: number | null;
  /** Próximo mantenimiento, ya resuelto por la pantalla. */
  nextMaintenance?: { title: string; remaining: string; taskId: number } | null;
  /** Días hasta el vencimiento del seguro y de la ITV (negativo = caducado). */
  insuranceDays: number | null;
  itvDays: number | null;
  /** Km recorridos este mes y el anterior. */
  km?: { current: number; previous: number | null };
}

const MONTH = 30;

export function buildInsights(input: InsightInput): InsightCard[] {
  const cards: InsightCard[] = [];
  const base = `/coches/${input.carId}`;

  // ── Consumo ───────────────────────────────────────────────────────
  if (input.averageFuel != null && input.recentFuel != null && input.averageFuel > 0) {
    const change = ((input.recentFuel - input.averageFuel) / input.averageFuel) * 100;
    // Menos de un 3% es ruido de un repostaje: no da para titular.
    if (Math.abs(change) >= 3) {
      const better = change < 0;
      cards.push({
        id: "fuel-trend",
        icon: "fuel",
        accent: better ? "green" : "orange",
        title: better
          ? `El consumo ha mejorado un ${Math.abs(Math.round(change))}%`
          : `El consumo ha subido un ${Math.round(change)}%`,
        description: `Últimos repostajes a ${input.recentFuel.toFixed(1)} L/100km frente a ${input.averageFuel.toFixed(1)} de media.`,
      });
    }
  }

  // ── Gasto del mes ─────────────────────────────────────────────────
  if (input.monthly.previous > 0) {
    const diff = input.monthly.current - input.monthly.previous;
    if (Math.abs(diff) >= 1) {
      const less = diff < 0;
      cards.push({
        id: "spend-trend",
        icon: "euro",
        accent: less ? "green" : "primary",
        title: less
          ? `Has gastado ${formatCurrency(Math.abs(diff))} menos que el mes pasado`
          : `Has gastado ${formatCurrency(diff)} más que el mes pasado`,
        description: `Este mes llevas ${formatCurrency(input.monthly.current)}; el anterior fueron ${formatCurrency(input.monthly.previous)}.`,
        href: `${base}/gastos`,
        cta: "Ver gastos",
      });
    }
  }

  // ── Próximo mantenimiento ─────────────────────────────────────────
  if (input.nextMaintenance) {
    cards.push({
      id: "next-maintenance",
      icon: "wrench",
      accent: "orange",
      title: `${input.nextMaintenance.title}: ${input.nextMaintenance.remaining}`,
      description: "Prepáralo con tiempo para no llegar con el plazo encima.",
      href: `${base}/mantenimiento/${input.nextMaintenance.taskId}`,
      cta: "Ver mantenimiento",
    });
  }

  // ── Seguro e ITV ──────────────────────────────────────────────────
  if (input.insuranceDays != null && input.insuranceDays < 90) {
    const expired = input.insuranceDays < 0;
    cards.push({
      id: "insurance",
      icon: "shield",
      accent: expired ? "danger" : "blue",
      title: expired
        ? "El seguro está caducado"
        : `El seguro vence en ${describeDays(input.insuranceDays)}`,
      description: expired
        ? "Sin seguro en vigor el coche no puede circular."
        : "Buen momento para comparar precios antes de que se renueve solo.",
      href: `${base}/editar`,
      cta: "Actualizar fecha",
    });
  }

  if (input.itvDays != null && input.itvDays < 60) {
    const expired = input.itvDays < 0;
    cards.push({
      id: "itv",
      icon: "success",
      accent: expired ? "danger" : "orange",
      title: expired ? "La ITV está caducada" : `La ITV vence en ${describeDays(input.itvDays)}`,
      description: expired
        ? "Circular con la ITV caducada es sanción y el seguro puede no cubrir."
        : "Pide cita: en muchas estaciones no hay hueco de un día para otro.",
      href: `${base}/editar`,
      cta: "Actualizar fecha",
    });
  }

  // ── Kilómetros ────────────────────────────────────────────────────
  if (input.km && input.km.previous != null && input.km.previous > 0 && input.km.current > 0) {
    const change = ((input.km.current - input.km.previous) / input.km.previous) * 100;
    if (Math.abs(change) >= 20) {
      cards.push({
        id: "km-trend",
        icon: "gauge",
        accent: "blue",
        title:
          change > 0
            ? `Este mes conduces un ${Math.round(change)}% más`
            : `Este mes conduces un ${Math.abs(Math.round(change))}% menos`,
        description: `${formatKm(input.km.current)} este mes frente a ${formatKm(input.km.previous)} el anterior.`,
      });
    }
  }

  return cards;
}

/** "12 días", "2 meses" — a partir de dos meses el día exacto estorba. */
function describeDays(days: number): string {
  if (days < MONTH) return `${days} ${days === 1 ? "día" : "días"}`;
  const months = Math.round(days / MONTH);
  return `${months} ${months === 1 ? "mes" : "meses"}`;
}
