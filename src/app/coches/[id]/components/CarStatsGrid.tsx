// 6-tarjeta de métricas: Gasto mensual, Proyección anual, Ahorro DIY,
// Consumo medio, Coste/km, Precio gasolina.
//
// Rediseño Ticket 1.5: grid 2×3, cada tarjeta con icono circular de color
// suave + label pequeño arriba + valor grande abajo + nota pequeña gris.
// Gasto mensual incluye flecha de tendencia vs mes anterior usando el
// safeDiff/safeNum blindado en el Ticket 1.4. NO se toca la lógica de
// cálculo: este ticket es SOLO JSX/clases Tailwind.

import {
  TrendingUp, BarChart3, PiggyBank, Droplet, TrendingDown, Fuel,
} from "lucide-react";
import { fmtOrDash } from "../lib/format";
import type { CarMetrics } from "../lib/types";

interface CarStatsGridProps {
  metrics: CarMetrics;
}

// Paleta local coherente con el rediseño Ticket 1.5 (mismo lenguaje que
// CarHeader). Tonos suaves para fondos de icono, tonos vivos para iconos.
const ICON_BG_RED    = "#fde7e6";
const ICON_FG_RED    = "#c3423f"; // var(--accent)
const ICON_BG_GREEN  = "#e6f3ec";
const ICON_FG_GREEN  = "#4f9d69"; // var(--success)
const ICON_BG_BLUE   = "#e7eef7";
const ICON_FG_BLUE   = "#3b82f6";
const ICON_BG_GRAY   = "#f2f2f3";
const ICON_FG_GRAY   = "#4a4548"; // text-secondary

const TEXT_DARK = "#211a1e";
const TEXT_GRAY = "#8a8588";

export default function CarStatsGrid({ metrics }: CarStatsGridProps) {
  // Helper que distingue número finito real (incluido 0) de null/undefined
  // / NaN / Infinity / strings. Misma idea que el safeNum del Ticket 1.4.
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
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {/* 1) Gasto mensual — rojo, con flecha vs mes anterior */}
      <Card
        iconBg={ICON_BG_RED} iconFg={ICON_FG_RED}
        icon={<TrendingDown size={20} strokeWidth={1.8} />}
        label="Gasto mensual"
        value={`${fmtOrDash(safeCurrent, 2)}€`}
        note={
          <DiffNote safeDiff={safeDiff} />
        }
      />

      {/* 2) Proyección anual — rojo */}
      <Card
        iconBg={ICON_BG_RED} iconFg={ICON_FG_RED}
        icon={<BarChart3 size={20} strokeWidth={1.8} />}
        label="Proyección anual"
        value={`${fmtOrDash(safeProjectedAnnual, 2)}€`}
        note="12 × mes actual"
      />

      {/* 3) Ahorro DIY — verde */}
      <Card
        iconBg={ICON_BG_GREEN} iconFg={ICON_FG_GREEN}
        icon={<PiggyBank size={20} strokeWidth={1.8} />}
        label="Ahorro DIY"
        value={`${fmtOrDash(safeDiy, 2)}€`}
        note="en bricolaje"
      />

      {/* 4) Consumo medio — azul/gris */}
      <Card
        iconBg={ICON_BG_BLUE} iconFg={ICON_FG_BLUE}
        icon={<Droplet size={20} strokeWidth={1.8} />}
        label="Consumo medio"
        value={fmtOrDash(safeL100, 1)}
        note="L/100km"
      />

      {/* 5) Coste por km — gris */}
      <Card
        iconBg={ICON_BG_GRAY} iconFg={ICON_FG_GRAY}
        icon={<TrendingUp size={20} strokeWidth={1.8} />}
        label="Coste por km"
        value={`${fmtOrDash(safeTotal ?? safeFuelCostPerKm ?? null, 3)}€`}
        note={
          safeTotal !== null
            ? "total €/km"
            : safeFuelCostPerKm !== null
            ? "solo carburante"
            : "sin datos"
        }
      />

      {/* 6) Precio gasolina — gris */}
      <Card
        iconBg={ICON_BG_GRAY} iconFg={ICON_FG_GRAY}
        icon={<Fuel size={20} strokeWidth={1.8} />}
        label="Precio gasolina"
        value={`${fmtOrDash(safePricePerLiter, 3)}€`}
        note="€/L último repostaje"
      />
    </div>
  );
}

/* ─────────────── helpers ─────────────── */

interface CardProps {
  iconBg: string;
  iconFg: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  note: React.ReactNode;
}

// Tarjeta del mockup: icono circular arriba-izquierda, label pequeño
// debajo, valor grande, nota pequeña gris.
function Card({ iconBg, iconFg, icon, label, value, note }: CardProps) {
  return (
    <div className="card !p-3.5">
      <div className="flex items-start gap-2.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg, color: iconFg }}
          aria-hidden
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[12px] leading-tight"
            style={{ color: TEXT_GRAY }}
          >
            {label}
          </p>
          <p
            className="text-[18px] font-bold leading-tight mt-1 truncate"
            style={{ color: TEXT_DARK }}
            title={value}
          >
            {value}
          </p>
          <p
            className="text-[11px] leading-tight mt-1 truncate"
            style={{ color: TEXT_GRAY }}
          >
            {note}
          </p>
        </div>
      </div>
    </div>
  );
}

// Indicador de tendencia para "Gasto mensual vs mes anterior".
// - null safeDiff       → gris neutro (sin datos)
// - safeDiff > 0        → rojo + flecha arriba + "+X,XX€ vs mes anterior"
// - safeDiff < 0        → verde + flecha abajo + "-X,XX€ vs mes anterior"
// - safeDiff === 0      → gris neutro + "0,00€ vs mes anterior"
function DiffNote({ safeDiff }: { safeDiff: number | null }) {
  if (safeDiff === null) {
    return (
      <span style={{ color: TEXT_GRAY }}>vs mes anterior</span>
    );
  }
  if (safeDiff === 0) {
    return (
      <span style={{ color: TEXT_GRAY }}>0,00€ vs mes anterior</span>
    );
  }
  const up = safeDiff > 0;
  const color = up ? "#c3423f" : "#4f9d69";
  const sign = up ? "+" : "−";
  const abs = Math.abs(safeDiff);
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{ color }}
      aria-label={up ? "Ha subido este mes" : "Ha bajado este mes"}
    >
      <TrendingUp
        size={11}
        strokeWidth={2.2}
        style={{
          color,
          transform: up ? "none" : "rotate(180deg)",
        }}
        aria-hidden
      />
      <span>{sign}{fmtOrDash(abs, 2)}€ vs mes anterior</span>
    </span>
  );
}