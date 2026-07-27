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
export { CATEGORIES };
export const CATEGORIAS = CATEGORIES.map(c => c.label);
export const TIPO_COLOR = Object.fromEntries(CATEGORIES.map(c => [c.label, c.color])) as Record<string, string>;

// Ticket 1.23: funciones puras de check por tipo. Usan `tipoId` cuando
// está disponible (fuente de verdad estable) y caen al `tipo` (label
// legible) como fallback. Esto evita comparaciones literales dispersas
// por el código que se rompen cuando alguien añade un typo o renombra
// una categoría.

/** Acepta (tipo) o (tipo, tipoId). Devuelve true si es el id semántico o
 *  si el label matchea (case-insensitive). */
function matches(form: { tipo: string; tipoId?: string | null | undefined }, id: string, label: string): boolean {
  if (form.tipoId) return form.tipoId === id;
  return form.tipo.toLowerCase() === label.toLowerCase();
}

export function isFuel(form: { tipo: string; tipoId?: string | null | undefined }) {
  return matches(form, "carburante", "Carburante");
}
// DIY: solo el gasto hecho por el usuario (no Taller). Es donde tiene
// sentido comparar contra "coste_estimado_taller".
export function isDiy(form: { tipo: string; tipoId?: string | null | undefined }) {
  return matches(form, "mantenimiento_diy", "Mantenimiento (DIY)");
}
// Taller: gasto pagado al mecánico. NO muestra coste_estimado_taller
// (Ticket 1.16) porque ya tienes el importe real.
export function isTaller(form: { tipo: string; tipoId?: string | null | undefined }) {
  return matches(form, "mantenimiento", "Mantenimiento (Taller)");
}
export function isMaintenance(form: { tipo: string; tipoId?: string | null | undefined }) {
  return isFuel(form) || isDiy(form) || isTaller(form);
}

/** ITV/Seguro/Impuestos son los tipos con cadencia anual y auto-actualizan
 *  la fecha del coche. Ticket 1.23. */
export function isItv(form: { tipo: string; tipoId?: string | null | undefined }) {
  return matches(form, "itv", "ITV");
}
export function isSeguro(form: { tipo: string; tipoId?: string | null | undefined }) {
  return matches(form, "seguro", "Seguro");
}
export function isImpuestos(form: { tipo: string; tipoId?: string | null | undefined }) {
  return matches(form, "impuestos", "Impuestos");
}
export function isAnnual(form: { tipo: string; tipoId?: string | null | undefined }) {
  return matches(form, "itv", "ITV")
      || matches(form, "seguro", "Seguro")
      || matches(form, "impuestos", "Impuestos");
}
