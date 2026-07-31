"use client";

// Envoltorio perezoso de los gráficos. chart.js + react-chartjs-2 solo se
// descargan cuando una pantalla monta de verdad un gráfico; mientras llega el
// chunk se enseña el hueco con skeleton, nunca un spinner.
//
// El contenedor fija la altura para que la llegada del gráfico no desplace el
// contenido de debajo (evita el salto de layout).

import dynamic from "next/dynamic";
import AppSkeleton from "./AppSkeleton";
import { cn } from "./cn";

function ChartFallback({ height }: { height: number }) {
  return <AppSkeleton height={height} rounded="chip" />;
}

export const DonutChart = dynamic(
  () => import("./charts/ChartImpl").then((m) => m.DonutChart),
  { ssr: false, loading: () => <ChartFallback height={160} /> },
);

export const LineChart = dynamic(
  () => import("./charts/ChartImpl").then((m) => m.LineChart),
  { ssr: false, loading: () => <ChartFallback height={160} /> },
);

export const BarChart = dynamic(
  () => import("./charts/ChartImpl").then((m) => m.BarChart),
  { ssr: false, loading: () => <ChartFallback height={80} /> },
);

export interface AppChartProps {
  children: React.ReactNode;
  /** Altura en píxeles del lienzo. Fija por diseño: los gráficos responden en
   *  ancho, no en alto. */
  height: number;
  className?: string;
}

/** Contenedor con altura reservada para cualquiera de los gráficos. */
export default function AppChart({ children, height, className }: AppChartProps) {
  return (
    <div className={cn("relative w-full", className)} style={{ height }}>
      {children}
    </div>
  );
}
