// Pantalla 12 del mockup: Insights del vehículo.
//
// Tres tarjetas y nada más: la puntuación sobre su tendencia, las dos
// métricas de uso (consumo y coste por km) y los kilómetros del mes. La
// pantalla se lee en cinco segundos; cualquier cosa añadida aquí —repartos,
// históricos, recomendaciones— la convierte en un panel de análisis, que es
// justo lo que no es.
//
// Todo sale de datos ya registrados: si falta la base para un cálculo se
// enseña un guion, nunca un número inventado.

import { AppHeader, AppStatCard } from "@/components/ui";
import { AppScreenMain } from "@/components/ui/AppLayout";
import { requireCar } from "../lib/loadCar";
import { computeCarScore, getScoreHistory, recordCarScore } from "@/lib/db/score";
import {
  getFuelConsumption, getTotalCostPerKm, getMonthlyKm,
  getRecentFuelConsumption, getRecentCostPerKm,
} from "@/lib/db/metrics";
import { CONDITION_ACCENT } from "@/lib/ui/vehicle";
import { formatConsumption, formatCurrencyPrecise } from "@/lib/format";
import { ScoreHero, MonthlyKmChart } from "./InsightsCharts";

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

  const accent = CONDITION_ACCENT[score.condition];
  const history = getScoreHistory(car.id, 12);
  const fuel = getFuelConsumption(car.id);
  const costPerKm = getTotalCostPerKm(car.id);
  // Doce meses: la miniatura de barras necesita una serie para tener forma;
  // con seis, medio año sin lecturas la deja en una o dos barras sueltas.
  const monthlyKm = getMonthlyKm(car.id, 12);

  // "vs media": lo de ahora frente a lo de siempre. Una diferencia que se
  // redondea a cero no es una diferencia: se omite en vez de pintar
  // "0,00 € vs media" con una flecha al lado.
  const recentFuel = getRecentFuelConsumption(car.id);
  const rawFuelDelta =
    recentFuel != null && fuel.l100km != null
      ? Math.round((recentFuel - fuel.l100km) * 100) / 100
      : null;
  const fuelDelta = rawFuelDelta != null && Math.abs(rawFuelDelta) >= 0.1 ? rawFuelDelta : null;

  const recentCost = getRecentCostPerKm(car.id);
  const rawCostDelta =
    recentCost != null && costPerKm != null
      ? Math.round((recentCost - costPerKm) * 10000) / 10000
      : null;
  const costDelta = rawCostDelta != null && Math.abs(rawCostDelta) >= 0.01 ? rawCostDelta : null;

  return (
    <>
      {/* La (i) del mockup lleva al resumen, que es donde se explica de dónde
          sale la puntuación (la sección de avisos con lo que resta puntos). */}
      <AppHeader
        title="Insights del vehículo"
        align="center"
        back={`/coches/${car.id}`}
        actions={[{ icon: "info", label: "Cómo se calcula", href: `/coches/${car.id}` }]}
      />

      <AppScreenMain hasBottomNav className="space-y-4 pt-2">
        <ScoreHero
          score={score.score}
          accent={accent}
          label={`${score.label} estado`}
          history={history}
        />

        <div className="grid grid-cols-2 gap-3">
          <AppStatCard
            label="Consumo medio"
            value={fuel.l100km != null ? formatConsumption(fuel.l100km) : "—"}
            unit="L/100km"
            delta={fuelDelta != null ? `${formatConsumption(Math.abs(fuelDelta))} vs media` : undefined}
            deltaDirection={fuelDelta != null && fuelDelta > 0 ? "up" : "down"}
            // Gastar menos combustible por 100 km es una buena noticia.
            deltaGood={fuelDelta != null ? fuelDelta <= 0 : undefined}
          />
          <AppStatCard
            label="Coste por km"
            value={costPerKm != null ? formatCurrencyPrecise(costPerKm) : "—"}
            unit="por kilómetro"
            delta={costDelta != null ? `${formatCurrencyPrecise(Math.abs(costDelta))} vs media` : undefined}
            deltaDirection={costDelta != null && costDelta > 0 ? "up" : "down"}
            deltaGood={costDelta != null ? costDelta <= 0 : undefined}
          />
        </div>

        {monthlyKm.length > 0 && <MonthlyKmChart data={monthlyKm} />}
      </AppScreenMain>
    </>
  );
}
