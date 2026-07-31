// Pantalla 12 del mockup: Insights del vehículo.
//
// Puntuación y su evolución, consumo medio, coste por kilómetro y kilómetros
// del mes. Todo sale de datos ya registrados: si falta la base para un
// cálculo se enseña un guion, nunca un número inventado.

import { AppHeader, AppStatCard, AppCard } from "@/components/ui";
import { AppScreenMain } from "@/components/ui/AppLayout";
import { requireCar } from "../lib/loadCar";
import { computeCarScore, getScoreHistory, recordCarScore } from "@/lib/db/score";
import { getFuelConsumption, getTotalCostPerKm, getMonthlyKm } from "@/lib/db/metrics";
import { CONDITION_ACCENT } from "@/lib/ui/vehicle";
import { formatConsumption, formatCurrencyPrecise } from "@/lib/format";
import { ScoreTrend, MonthlyKmChart } from "./InsightsCharts";

export const dynamic = "force-dynamic";

export default async function InsightsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const car = await requireCar(params);

  const score = computeCarScore(car.id);
  // Visitar Insights deja constancia de la puntuación de este mes. Es
  // idempotente (una fila por mes), y sin ella la gráfica de evolución no
  // tendría de dónde salir: no se puede reconstruir hacia atrás.
  recordCarScore(car.id, score.score);

  const history = getScoreHistory(car.id, 12);
  const fuel = getFuelConsumption(car.id);
  const costPerKm = getTotalCostPerKm(car.id);
  const monthlyKm = getMonthlyKm(car.id, 6);

  return (
    <>
      <AppHeader
        title="Insights"
        back={`/coches/${car.id}`}
        actions={[{ icon: "info", label: "Cómo se calculan", href: `/coches/${car.id}` }]}
      />

      <AppScreenMain hasBottomNav className="space-y-4 pt-2">
        <ScoreTrend
          score={score.score}
          accent={CONDITION_ACCENT[score.condition]}
          label={`${score.label} estado`}
          history={history}
        />

        <div className="grid grid-cols-2 gap-3">
          <AppStatCard
            label="Consumo medio"
            value={fuel.l100km != null ? formatConsumption(fuel.l100km) : "—"}
            unit="L/100km"
          />
          <AppStatCard
            label="Coste por km"
            value={costPerKm != null ? formatCurrencyPrecise(costPerKm) : "—"}
            unit="por kilómetro"
          />
        </div>

        {monthlyKm.length > 0 && <MonthlyKmChart data={monthlyKm} />}

        {score.factors.length > 0 && (
          <AppCard>
            <p className="text-caption text-text-secondary">Qué resta puntos</p>
            <ul className="mt-2 space-y-2">
              {score.factors.map((f) => (
                <li key={f.label} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 flex-1 text-body text-text">{f.label}</span>
                  <span className="tabular shrink-0 text-body font-semibold text-danger">
                    −{f.penalty}
                  </span>
                </li>
              ))}
            </ul>
          </AppCard>
        )}
      </AppScreenMain>
    </>
  );
}
