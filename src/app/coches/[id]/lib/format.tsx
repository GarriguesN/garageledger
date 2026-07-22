// Helpers de formato y constantes de presentación compartidas entre
// subcomponentes del detalle del coche.

import * as React from "react";

export function fmt(n: number) {
  return n.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmt0(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 0 });
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

export const CATEGORIAS = [
  "Carburante", "Mantenimiento (DIY)", "Mantenimiento (Taller)",
  "Tuning",
  "Seguro", "ITV", "Impuestos", "Parking", "Peajes", "Lavado", "Otros",
];

// Color por categoría para los badges / iconos del historial.
export const TIPO_COLOR: Record<string, string> = {
  "Carburante": "#c3423f",
  "Mantenimiento (DIY)": "#4f9d69",
  "Mantenimiento (Taller)": "#d4956a",
  "Tuning": "#8b5cf6",
  "Seguro": "#3b82f6",
  "ITV": "#8b5cf6",
  "Impuestos": "#f59e0b",
  "Parking": "#6b7280",
  "Peajes": "#10b981",
  "Lavado": "#ec4899",
  "Otros": "#6b7280",
};

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
