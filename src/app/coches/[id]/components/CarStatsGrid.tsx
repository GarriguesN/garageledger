// 6-tarjeta de métricas: Gasto mes, Proyección anual, Ahorro DIY,
// Consumo medio, Coste/km, Precio gasolina. Calcula el diff vs mes
// anterior para el indicador trending-up/down.

import { TrendingDown } from "lucide-react";
import { fmtOrDash } from "../lib/format";
import type { CarMetrics } from "../lib/types";

interface CarStatsGridProps {
  metrics: CarMetrics;
}

export default function CarStatsGrid({ metrics }: CarStatsGridProps) {
  // `diff` puede ser NaN si por algún motivo monthly.current o monthly.previous
  // vienen no-numéricos. Lo protegemos para que la UI nunca renderice "NaN"
  // ni "null" / "undefined" literales. Distinguimos tres casos por número:
  //   - número finito  → se usa tal cual (incluido el 0 real)
  //   - null/undefined → `null` (lo pintaremos como "—" vía fmtOrDash)
  //   - cualquier otra cosa (NaN, Infinity, string) → `null`
  function safeNum(n: unknown): number | null {
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  }
  const safeCurrent  = safeNum(metrics.monthly?.current);
  const safePrevious = safeNum(metrics.monthly?.previous);
  const safeDiff =
    safeCurrent !== null && safePrevious !== null ? safeCurrent - safePrevious : null;
  const safeTotal = safeNum(metrics.totalCostPerKm);
  const safeFuelCostPerKm = safeNum(metrics.fuel?.costPerKm);
  const safePricePerLiter = safeNum(metrics.fuel?.pricePerLiter);
  const safeL100 = safeNum(metrics.fuel?.l100km);
  const safeProjectedAnnual = safeNum(metrics.projectedAnnual);
  const safeDiy = safeNum(metrics.diy);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="card">
        <p className="text-xs text-[var(--text-muted)] mb-1">Gasto mes</p>
        <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>
          {fmtOrDash(safeCurrent, 2)}€
        </p>
        <p className={`text-xs flex items-center gap-1 ${safeDiff === null ? "text-[var(--text-muted)]" : safeDiff > 0 ? "text-red-500" : "text-green-600"}`}>
          <TrendingDown size={12} /> {safeDiff !== null && safeDiff > 0 ? "+" : ""}
          {fmtOrDash(safeDiff, 2)}€
        </p>
      </div>
      <div className="card">
        <p className="text-xs text-[var(--text-muted)] mb-1">Proyección anual</p>
        <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>
          {fmtOrDash(safeProjectedAnnual, 2)}€
        </p>
        <p className="text-xs text-[var(--text-muted)]">12 × mes actual</p>
      </div>
      <div className="card">
        <p className="text-xs text-[var(--text-muted)] mb-1">Ahorro DIY</p>
        <p className="text-lg font-bold" style={{ color: "var(--success)" }}>
          {fmtOrDash(safeDiy, 2)}€
        </p>
        <p className="text-xs text-[var(--text-muted)]">en bricolaje</p>
      </div>
      <div className="card">
        <p className="text-xs text-[var(--text-muted)] mb-1">Consumo</p>
        <p className="text-lg font-bold">
          {fmtOrDash(safeL100, 1)}
        </p>
        <p className="text-xs text-[var(--text-muted)]">L/100km</p>
      </div>
      <div className="card">
        <p className="text-xs text-[var(--text-muted)] mb-1">Coste/km</p>
        <p className="text-lg font-bold">
          {fmtOrDash(
            safeTotal ?? safeFuelCostPerKm ?? null,
            3
          )}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {safeTotal !== null
            ? "total"
            : safeFuelCostPerKm !== null
            ? "solo carburante"
            : "sin datos"} €/km
        </p>
      </div>
      <div className="card">
        <p className="text-xs text-[var(--text-muted)] mb-1">Precio gasolina</p>
        <p className="text-lg font-bold">
          {fmtOrDash(safePricePerLiter, 3)}
        </p>
        <p className="text-xs text-[var(--text-muted)]">€/L último repostaje</p>
      </div>
    </div>
  );
}
