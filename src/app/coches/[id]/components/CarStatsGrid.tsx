// 6-tarjeta de métricas: Gasto mes, Proyección anual, Ahorro DIY,
// Consumo medio, Coste/km, Precio gasolina. Calcula el diff vs mes
// anterior para el indicador trending-up/down.

import { TrendingDown } from "lucide-react";
import { fmt } from "../lib/format";
import type { CarMetrics } from "../lib/types";

interface CarStatsGridProps {
  metrics: CarMetrics;
}

export default function CarStatsGrid({ metrics }: CarStatsGridProps) {
  const diff = metrics.monthly.current - metrics.monthly.previous;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="card">
        <p className="text-xs text-[var(--text-muted)] mb-1">Gasto mes</p>
        <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>
          {fmt(metrics.monthly.current)}€
        </p>
        <p className={`text-xs flex items-center gap-1 ${diff > 0 ? "text-red-500" : "text-green-600"}`}>
          <TrendingDown size={12} /> {diff > 0 ? "+" : ""}
          {fmt(diff)}€
        </p>
      </div>
      <div className="card">
        <p className="text-xs text-[var(--text-muted)] mb-1">Proyección anual</p>
        <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>
          {fmt(metrics.projectedAnnual)}€
        </p>
        <p className="text-xs text-[var(--text-muted)]">12 × mes actual</p>
      </div>
      <div className="card">
        <p className="text-xs text-[var(--text-muted)] mb-1">Ahorro DIY</p>
        <p className="text-lg font-bold" style={{ color: "var(--success)" }}>
          {fmt(metrics.diy)}€
        </p>
        <p className="text-xs text-[var(--text-muted)]">en bricolaje</p>
      </div>
      <div className="card">
        <p className="text-xs text-[var(--text-muted)] mb-1">Consumo</p>
        <p className="text-lg font-bold">
          {metrics.fuel.l100km !== null ? metrics.fuel.l100km.toFixed(1) : "—"}
        </p>
        <p className="text-xs text-[var(--text-muted)]">L/100km</p>
      </div>
      <div className="card">
        <p className="text-xs text-[var(--text-muted)] mb-1">Coste/km</p>
        <p className="text-lg font-bold">
          {metrics.totalCostPerKm !== null
            ? metrics.totalCostPerKm.toFixed(3)
            : metrics.fuel.costPerKm !== null
            ? metrics.fuel.costPerKm.toFixed(3)
            : "—"}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {metrics.totalCostPerKm !== null ? "total" : "solo carburante"} €/km
        </p>
      </div>
      <div className="card">
        <p className="text-xs text-[var(--text-muted)] mb-1">Precio gasolina</p>
        <p className="text-lg font-bold">
          {metrics.fuel.pricePerLiter !== null ? metrics.fuel.pricePerLiter.toFixed(3) : "—"}
        </p>
        <p className="text-xs text-[var(--text-muted)]">€/L último repostaje</p>
      </div>
    </div>
  );
}
