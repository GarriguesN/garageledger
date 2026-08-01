"use client";

// Las dos piezas con gráfica de la pantalla 12. Van en su propio archivo
// porque los envoltorios de chart.js son de cliente y el resto de Insights
// puede seguir siendo servidor: así chart.js no entra en el HTML inicial.

import { AppCard, AppChart, LineChart, BarChart } from "@/components/ui";
import { accents, type AccentToken } from "@/design/tokens";
import { cn } from "@/components/ui/cn";
import { formatMonthLabel, formatNumber } from "@/lib/format";

/** Tarjeta principal: la gráfica ES la tarjeta y la puntuación flota encima,
 *  arriba a la izquierda (mockup 12).
 *
 *  Por eso la línea va en una capa absoluta y no en una columna propia: si
 *  ocupara su sitio en el flujo, la cifra la empujaría y la línea dejaría de
 *  cruzar la tarjeta de lado a lado. La capa ocupa ~70% del alto y llega
 *  hasta los bordes del relleno. */
export function ScoreHero({
  score,
  accent,
  label,
  history,
}: {
  score: number;
  accent: AccentToken;
  label: string;
  history: { month: string; score: number }[];
}) {
  const color = accents[accent];
  const hasTrend = history.length > 1;

  return (
    // Sin tendencia que dibujar la tarjeta se ajusta a su contenido: reservar
    // el alto de una gráfica que no existe deja un agujero.
    <AppCard className={cn("relative overflow-hidden", hasTrend && "h-56")}>
      {/* La capa arranca bajo el rótulo y llega al borde inferior: ~70% del
          alto de la tarjeta, cruzándola de lado a lado por detrás de la
          cifra. La altura va en número porque el lienzo de chart.js no puede
          medirse contra un contenedor sin alto propio. */}
      {hasTrend && (
        <div aria-hidden="true" className="absolute inset-x-4 bottom-4 top-12">
          <AppChart height={160}>
            <LineChart
              labels={history.map((h) => formatMonthLabel(h.month))}
              values={history.map((h) => h.score)}
              accent={accent}
              variant="hero"
            />
          </AppChart>
        </div>
      )}

      <div className="relative">
        <p className="text-caption text-text-secondary">Puntuación del vehículo</p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="tabular text-display font-bold leading-none" style={{ color }}>
            {score}
          </span>
          <span className="text-body font-medium text-text-secondary">/100</span>
        </p>
        <p className="mt-1 text-body font-semibold" style={{ color }}>
          {label}
        </p>
        {!hasTrend && (
          <p className="mt-3 text-caption text-text-muted">
            La evolución aparecerá cuando haya al menos dos meses registrados.
          </p>
        )}
      </div>
    </AppCard>
  );
}

/** Kilómetros del mes: cifra a la izquierda, barras compactas a la derecha
 *  ocupando un tercio del ancho. Las barras son decorativas —sin ejes, sin
 *  etiquetas— y solo dan la forma del uso reciente. */
export function MonthlyKmChart({
  data,
}: {
  data: { month: string; km: number }[];
}) {
  const current = data.length ? data[data.length - 1].km : 0;
  const previous = data.length > 1 ? data[data.length - 2].km : null;
  // Solo se compara contra un mes anterior con lectura: comparar contra un
  // mes sin datos diría "+100%" de la nada.
  const delta = previous != null && previous > 0 ? current - previous : null;

  // Los meses sin lectura de cuentakilómetros salen apagados: no sabemos
  // cuánto se condujo, y pintarlos igual que un mes real sería mentir.
  const muted = data.map((d, i) => (d.km === 0 ? i : -1)).filter((i) => i >= 0);

  return (
    <AppCard>
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-caption text-text-secondary">Kilómetros este mes</p>
          <p className="tabular mt-2 text-display font-bold leading-none text-text">
            +{formatNumber(current)} km
          </p>
          <p className="mt-2 text-caption text-text-secondary">
            {delta != null
              ? `${delta >= 0 ? "▲" : "▼"} ${formatNumber(Math.abs(delta))} km vs mes anterior`
              : "vs mes anterior"}
          </p>
        </div>

        <div aria-hidden="true" className="w-1/3 shrink-0">
          <AppChart height={72}>
            <BarChart
              labels={data.map((d) => formatMonthLabel(d.month))}
              values={data.map((d) => d.km)}
              accent="green"
              mutedIndices={muted}
              maxBarThickness={10}
            />
          </AppChart>
        </div>
      </div>
    </AppCard>
  );
}
