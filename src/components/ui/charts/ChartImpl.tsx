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
  /** `hero`: la gráfica ES el fondo de la tarjeta (mockup 12). Trazo fino,
   *  puntos redondos, rejilla muy tenue y nada de ejes, relleno ni tooltip:
   *  ahí la línea acompaña a la cifra, no se consulta. */
  variant = "default",
}: {
  labels: string[];
  values: number[];
  accent?: AccentToken;
  formatValue?: (v: number) => string;
  variant?: "default" | "hero";
}) {
  const color = accents[accent];
  const hero = variant === "hero";

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation,
    // En modo decorativo no hay interacción: ni tooltip, ni hover, ni cursor.
    events: hero ? [] : undefined,
    interaction: { intersect: false, mode: "index" },
    // Deja aire para que los puntos de los extremos no se recorten contra el
    // borde del lienzo.
    layout: hero ? { padding: { top: 6, bottom: 2, left: 4, right: 4 } } : undefined,
    plugins: {
      legend: { display: false },
      tooltip: hero
        ? { enabled: false }
        : {
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
        // En `hero` el eje se dibuja solo por su rejilla: sin etiquetas ni
        // línea de base.
        display: true,
        grid: hero
          ? { color: hexToRgba(colors.border, 0.55), drawTicks: false }
          : { display: false },
        border: { display: false },
        ticks: hero ? { display: false } : { color: colors.textMuted },
      },
      y: {
        display: true,
        beginAtZero: !hero,
        grid: hero
          ? { color: hexToRgba(colors.border, 0.55), drawTicks: false }
          : { color: colors.border },
        border: { display: false },
        ticks: hero
          ? { display: false }
          : {
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
            backgroundColor: hero ? color : hexToRgba(color, 0.12),
            borderWidth: 2,
            fill: !hero,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: color,
            pointBorderColor: hero ? color : colors.surface,
            pointBorderWidth: hero ? 0 : 2,
            pointHoverRadius: hero ? 3 : 5,
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
  /** Tope de grosor. Con pocas barras, chart.js las engorda hasta ocupar
   *  todo el ancho disponible y la miniatura deja de parecer una miniatura. */
  maxBarThickness,
}: {
  labels: string[];
  values: number[];
  accent?: AccentToken;
  mutedIndices?: number[];
  formatValue?: (v: number) => string;
  showAxes?: boolean;
  maxBarThickness?: number;
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
            maxBarThickness,
          },
        ],
      }}
    />
  );
}
