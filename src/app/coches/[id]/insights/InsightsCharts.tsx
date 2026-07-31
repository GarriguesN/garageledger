"use client";

// Gráficos de la pantalla 12. Componente aparte porque los envoltorios de
// chart.js son de cliente y el resto de Insights puede seguir siendo servidor.

import { AppCard, AppChart, LineChart, BarChart, AppProgressRing } from "@/components/ui";
import type { AccentToken } from "@/design/tokens";
import { formatMonthLabel, formatNumber } from "@/lib/format";

export function ScoreTrend({
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
  return (
    <AppCard>
      <p className="text-caption text-text-secondary">Puntuación del vehículo</p>
      <div className="mt-2 flex items-center gap-4">
        <AppProgressRing score={score} accent={accent} size={96} />
        <div className="min-w-0 flex-1">
          <p className="text-title font-semibold" style={{ color: `var(--color-${accent})` }}>
            {label}
          </p>
          {history.length > 1 ? (
            <AppChart height={72} className="mt-2">
              <LineChart
                labels={history.map((h) => formatMonthLabel(h.month))}
                values={history.map((h) => h.score)}
                accent={accent}
                sparkline
              />
            </AppChart>
          ) : (
            <p className="mt-2 text-caption text-text-muted">
              La evolución aparecerá cuando haya al menos dos meses registrados.
            </p>
          )}
        </div>
      </div>
    </AppCard>
  );
}

export function MonthlyKmChart({
  data,
}: {
  data: { month: string; km: number }[];
}) {
  const current = data.length ? data[data.length - 1].km : 0;
  // Los meses sin lectura de cuentakilómetros salen apagados: no sabemos
  // cuánto se condujo, y pintarlos igual que un mes real sería mentir.
  const muted = data.map((d, i) => (d.km === 0 ? i : -1)).filter((i) => i >= 0);

  return (
    <AppCard>
      <p className="text-caption text-text-secondary">Kilómetros este mes</p>
      <p className="tabular mt-1 text-display font-bold text-text">
        +{formatNumber(current)} km
      </p>
      <div className="mt-3">
        <AppChart height={72}>
          <BarChart
            labels={data.map((d) => formatMonthLabel(d.month))}
            values={data.map((d) => d.km)}
            accent="green"
            mutedIndices={muted}
            formatValue={(v) => `${formatNumber(v)} km`}
          />
        </AppChart>
      </div>
    </AppCard>
  );
}
