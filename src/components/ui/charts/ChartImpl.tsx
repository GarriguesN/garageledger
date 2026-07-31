"use client";

// Implementación real de los gráficos. Vive en su propio archivo porque
// AppChart lo carga con next/dynamic: chart.js pesa ~70 kB y solo dos
// pantallas lo necesitan, así que no debe entrar en el bundle inicial.
//
// Todos los colores salen de los tokens y la animación de entrada usa la
// duración `chart` (400 ms) del sistema.

import {
  Chart as ChartJS,
  ArcElement,
  LineElement,
  PointElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
  type ChartOptions,
} from "chart.js";
import { Doughnut, Line, Bar } from "react-chartjs-2";
import { colors, accents, durationMs, hexToRgba, type AccentToken } from "@/design/tokens";

ChartJS.register(
  ArcElement, LineElement, PointElement, BarElement,
  CategoryScale, LinearScale, Tooltip, Filler,
);

// Valores por defecto compartidos: fuente, color de texto y tooltip oscuro.
ChartJS.defaults.font.family =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
ChartJS.defaults.font.size = 12;
ChartJS.defaults.color = colors.textSecondary;

const tooltipStyle = {
  backgroundColor: colors.surfaceElevated,
  borderColor: colors.border,
  borderWidth: 1,
  titleColor: colors.text,
  bodyColor: colors.textSecondary,
  padding: 10,
  cornerRadius: 12,
  displayColors: false,
} as const;

const animation = { duration: durationMs.chart, easing: "easeOutQuart" } as const;

// ── Donut de reparto por categoría (mockup 5) ─────────────────────────

export interface DonutDatum {
  label: string;
  value: number;
  accent: AccentToken;
}

export function DonutChart({
  data,
  formatValue,
}: {
  data: DonutDatum[];
  formatValue?: (v: number) => string;
}) {
  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    animation,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle,
        callbacks: {
          label: (ctx) =>
            `${ctx.label}: ${formatValue ? formatValue(ctx.parsed) : ctx.parsed}`,
        },
      },
    },
  };

  return (
    <Doughnut
      options={options}
      data={{
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.value),
            backgroundColor: data.map((d) => accents[d.accent]),
            borderColor: colors.surface,
            borderWidth: 3,
            hoverOffset: 4,
          },
        ],
      }}
    />
  );
}

// ── Línea de evolución (mockups 5 y 12) ───────────────────────────────

export function LineChart({
  labels,
  values,
  accent = "primary",
  formatValue,
  /** Oculta puntos y ejes: la miniatura de tendencia del mockup 12. */
  sparkline = false,
}: {
  labels: string[];
  values: number[];
  accent?: AccentToken;
  formatValue?: (v: number) => string;
  sparkline?: boolean;
}) {
  const color = accents[accent];

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation,
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle,
        callbacks: {
          label: (ctx) => {
            const y = ctx.parsed.y ?? 0;
            return formatValue ? formatValue(y) : String(y);
          },
        },
      },
    },
    scales: {
      x: {
        display: !sparkline,
        grid: { display: false },
        border: { display: false },
        ticks: { color: colors.textMuted },
      },
      y: {
        display: !sparkline,
        beginAtZero: true,
        grid: { color: colors.border },
        border: { display: false },
        ticks: {
          color: colors.textMuted,
          maxTicksLimit: 4,
          callback: (v) => (formatValue ? formatValue(Number(v)) : String(v)),
        },
      },
    },
  };

  return (
    <Line
      options={options}
      data={{
        labels,
        datasets: [
          {
            data: values,
            borderColor: color,
            backgroundColor: hexToRgba(color, 0.12),
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointRadius: sparkline ? 0 : 3,
            pointBackgroundColor: color,
            pointBorderColor: colors.surface,
            pointBorderWidth: 2,
            pointHoverRadius: 5,
          },
        ],
      }}
    />
  );
}

// ── Barras de kilómetros por mes (mockup 12) ──────────────────────────

export function BarChart({
  labels,
  values,
  accent = "green",
  /** Índices que se pintan apagados (meses anteriores al actual). */
  mutedIndices = [],
  formatValue,
  showAxes = false,
}: {
  labels: string[];
  values: number[];
  accent?: AccentToken;
  mutedIndices?: number[];
  formatValue?: (v: number) => string;
  showAxes?: boolean;
}) {
  const color = accents[accent];
  const muted = new Set(mutedIndices);

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle,
        callbacks: {
          label: (ctx) => {
            const y = ctx.parsed.y ?? 0;
            return formatValue ? formatValue(y) : String(y);
          },
        },
      },
    },
    scales: {
      x: {
        display: showAxes,
        grid: { display: false },
        border: { display: false },
        ticks: { color: colors.textMuted },
      },
      y: { display: false, beginAtZero: true, grid: { display: false } },
    },
  };

  return (
    <Bar
      options={options}
      data={{
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: values.map((_, i) =>
              muted.has(i) ? hexToRgba(color, 0.28) : color,
            ),
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      }}
    />
  );
}
