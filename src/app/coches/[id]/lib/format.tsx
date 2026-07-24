// Helpers de formato y constantes de presentación compartidas entre
// subcomponentes del detalle del coche.

import * as React from "react";
import { CATEGORIES } from "@/lib/constants";

export function fmt(n: number) {
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  });
}

export function fmt0(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 0, useGrouping: true });
}

// Render seguro: si el valor no es un número finito (null, undefined, NaN,
// Infinity, o cualquier cosa que no sea `number`), devolvemos un guion. Esto
// blinda `CarStatsGrid` y futuros consumidores contra estados corruptos o
// filas incompletas (ej. consumo medio sin litros registrados → null).
// Si el valor es finito, lo formatea con `decimals` decimales y separador
// de millares es-ES (igual que fmt()/fmt0()).
export function fmtOrDash(n: unknown, decimals = 0): string {
  return typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString("es-ES", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: true })
    : "—";
}

export function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

export function formatLongMonthYear(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

// Sparkline SVG inline — minimal dependency, no chart lib.
// Return JSX | null; explicit return type keeps TS happy when used as JSX.
export function Sparkline({ data }: { data: number[] }): React.ReactElement | null {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 60, h = 20;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="inline-block align-middle">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
    </svg>
  );
}

// audit:M-9 — CATEGORIAS y TIPO_COLOR derivados de @/lib/constants (origen único).
export const CATEGORIAS = CATEGORIES.map(c => c.label);
export const TIPO_COLOR = Object.fromEntries(CATEGORIES.map(c => [c.label, c.color])) as Record<string, string>;

// Funciones puras de cálculo derivadas — útiles para que varios
// subcomponentes tengan el mismo cálculo sin duplicar.
export function isFuel(form: { tipo: string }) {
  return form.tipo === "Carburante";
}
export function isDiy(form: { tipo: string }) {
  return form.tipo === "Mantenimiento (DIY)" || form.tipo === "Mantenimiento (Taller)";
}
export function isMaintenance(form: { tipo: string }) {
  return isFuel(form) || isDiy(form);
}
