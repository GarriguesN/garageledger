// 6-tarjeta de métricas: Gasto mensual, Proyección anual, Ahorro DIY,
// Consumo medio, Coste/km, Precio gasolina.
//
// Rediseño Ticket 1.5: grid 2×3, cada tarjeta con icono circular de color
// suave + label pequeño arriba + valor grande abajo + nota pequeña gris.
// Gasto mensual incluye flecha de tendencia vs mes anterior usando el
// safeDiff/safeNum blindado en el Ticket 1.4. NO se toca la lógica de
// cálculo: este ticket es SOLO JSX/clases Tailwind.

import {
  TrendingUp, BarChart3, PiggyBank, Droplet, TrendingDown, Euro, Receipt, Gauge,
} from "lucide-react";
import { fmt0, fmtOrDash } from "../lib/format";
import type { CarMetrics } from "../lib/types";
import type { KmStats } from "@/lib/db/cars";
import Link from "next/link";

interface CarStatsGridProps {
  carId: number;
  metrics: CarMetrics;
  kmStats: KmStats;
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

export default function CarStatsGrid({ carId, metrics, kmStats }: CarStatsGridProps) {
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
        icon={<Euro size={20} strokeWidth={1.8} />}
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
        value={safeL100 !== null ? fmtOrDash(safeL100, 1) : "—"}
        valueSuffix="L/100km"
        note=""
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
        icon={<Receipt size={20} strokeWidth={1.8} />}
        label="Precio gasolina"
        value={`${fmtOrDash(safePricePerLiter, 3)}€`}
        note="€/L último repostaje"
      />

      {/* Card ancho completo: kilometraje — totales / este mes / media.
          Padding más bajo que las 6 cards anteriores para que ocupe
          menos vertical sin perder legibilidad. */}
      <div className="col-span-2 card !p-3">
        <div className="flex items-start gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: ICON_BG_BLUE, color: ICON_FG_BLUE }}
            aria-hidden
          >
            <Gauge size={20} strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] leading-tight" style={{ color: TEXT_GRAY }}>
              Kilometraje
            </p>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <KmCell
                value={fmt0(kmStats.total)}
                suffix="km"
                label="Totales"
              />
              <KmCell
                value={kmStats.thisMonth !== null ? fmt0(kmStats.thisMonth) : "—"}
                suffix="km"
                label="Este mes"
              />
              <KmCell
                value={kmStats.avgPerMonth !== null ? fmt0(kmStats.avgPerMonth) : "—"}
                suffix="km/mes"
                label="Media mensual"
                sublabel={kmStats.avgPerMonth === null ? "Falta fecha de matriculación o primer registro" : (kmStats.sourceLabel || undefined)}
                link={kmStats.avgPerMonth === null ? `/coches/${carId}/editar` : undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Bloque pequeño dentro de la card de kilometraje: valor grande + label
 *  pequeño debajo. */
function KmCell({
  value, suffix, label, sublabel, link,
}: {
  value: string;
  suffix: string;
  label: string;
  sublabel?: string;
  link?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[18px] font-bold leading-tight truncate" style={{ color: TEXT_DARK }} title={value}>
        {value}
        <span className="text-[11px] font-normal ml-1" style={{ color: TEXT_GRAY }}>
          {suffix}
        </span>
      </p>
      <p className="text-[10px] leading-tight mt-0.5 truncate" style={{ color: TEXT_GRAY }}>
        {label}
      </p>
      {sublabel && (
        link ? (
          <Link
            href={link}
            className="block text-[9px] leading-tight mt-0.5 truncate underline underline-offset-2"
            style={{ color: "var(--accent)" }}
            title={sublabel}
          >
            {sublabel} →
          </Link>
        ) : (
          <p
            className="text-[9px] leading-tight mt-0.5 truncate"
            style={{ color: TEXT_GRAY, opacity: 0.7 }}
            title={sublabel}
          >
            {sublabel}
          </p>
        )
      )}
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
  /** Texto a mostrar al lado del valor principal en la misma línea. */
  valueSuffix?: React.ReactNode;
  note: React.ReactNode;
}

// Tarjeta del mockup: icono circular arriba-izquierda, label pequeño
// debajo, valor grande, nota pequeña gris.
function Card({ iconBg, iconFg, icon, label, value, valueSuffix, note }: CardProps) {
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
            {valueSuffix && (
              <span
                className="text-[12px] font-normal ml-1"
                style={{ color: TEXT_GRAY }}
              >
                {valueSuffix}
              </span>
            )}
          </p>
          {note ? (
            <p
              className="text-[11px] leading-tight mt-1 whitespace-normal"
              style={{ color: TEXT_GRAY }}
            >
              {note}
            </p>
          ) : null}
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
      <span>{sign}{fmtOrDash(abs, 2)}€ vs mes anterior</span>
    </span>
  );
}

function TrendIcon({ safeDiff }: { safeDiff: number | null }) {
  return safeDiff !== null && safeDiff < 0
    ? <TrendingDown size={20} strokeWidth={1.8} />
    : <TrendingUp size={20} strokeWidth={1.8} />;
}