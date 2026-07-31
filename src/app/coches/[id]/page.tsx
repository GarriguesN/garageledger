// Pantalla 2 del mockup: Resumen del vehículo.
//
// Es un Server Component: los datos se leen directamente de src/lib/db/* sin
// pasar por la API ni por un useEffect, así que el HTML llega ya con la
// puntuación y el próximo mantenimiento. Solo son cliente las piezas que
// realmente interactúan (héroe con imagen, accesos rápidos).

import Link from "next/link";
import { AppHeader, AppCard, AppSection, AppProgress, AppIconChip, AppBadge } from "@/components/ui";
import { AppScreenMain } from "@/components/ui/AppLayout";
import { requireCar } from "./lib/loadCar";
import CarHero from "./components/CarHero";
import QuickActions from "./components/QuickActions";
import { computeCarScore } from "@/lib/db/score";
import { getMaintenanceTasks } from "@/lib/db/maintenance";
import { getMonthlySpend, getFuelConsumption } from "@/lib/db/metrics";
import { toMaintenanceView, sortByUrgency } from "@/lib/ui/maintenance";
import {
  CONDITION_ACCENT, vehiclePhotoUrl, vehicleName, vehicleSubtitle,
} from "@/lib/ui/vehicle";
import {
  formatCurrency, formatConsumption, percentChange,
} from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CarSummaryPage({ params }: PageProps) {
  const car = await requireCar(params);

  const score = computeCarScore(car.id);
  const accent = CONDITION_ACCENT[score.condition];
  const tasks = getMaintenanceTasks(car.id);
  const views = sortByUrgency(tasks.map((t) => toMaintenanceView(t, car.km_actuales)));
  const next = views[0];

  const monthly = getMonthlySpend(car.id);
  const spendDelta = percentChange(monthly.current, monthly.previous);
  const fuel = getFuelConsumption(car.id);

  // Línea de identidad bajo el título: "2009 · 1.8 i-VTEC · 0016GMP".
  const specLine = [vehicleSubtitle(car), car.matricula || null]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <AppHeader
        title={vehicleName(car)}
        align="center"
        back="/"
        actions={[
          { icon: "more", label: "Editar vehículo", href: `/coches/${car.id}/editar` },
        ]}
        subtitle={
          <div className="flex flex-col items-center gap-1">
            {car.generacion && <AppBadge accent="primary">{car.generacion}</AppBadge>}
            {specLine && <span className="text-caption text-text-secondary">{specLine}</span>}
          </div>
        }
      />

      <AppScreenMain hasBottomNav className="space-y-6 pt-2">
        <CarHero
          photoUrl={vehiclePhotoUrl(car.foto_attachment_id)}
          name={vehicleName(car)}
          score={score.score}
          scoreAccent={accent}
          conditionLabel={`${score.label} estado`}
          summary={score.summary}
        />

        {/* Sin mantenimientos programados el mockup no define nada, pero dejar
            el hueco vacío es peor que invitar a programar el primero. */}
        {!next && (
          <AppCard href={`/coches/${car.id}/mantenimiento`}>
            <p className="text-caption text-text-secondary">Próximo mantenimiento</p>
            <div className="mt-2 flex items-center gap-3">
              <AppIconChip icon="wrench" accent="blue" size="sm" />
              <span className="min-w-0 flex-1 text-body font-semibold text-text">
                Sin mantenimientos programados
              </span>
            </div>
            <p className="mt-2 text-caption text-text-muted">
              Programa uno para llevar el control de revisiones y cambios.
            </p>
          </AppCard>
        )}

        {next && (
          <AppCard>
            <p className="text-caption text-text-secondary">Próximo mantenimiento</p>
            <div className="mt-2 flex items-center gap-3">
              <AppIconChip
                icon={next.icon}
                accent={next.status === "critical" ? "danger" : next.status === "warning" ? "orange" : "green"}
                size="sm"
              />
              <span className="min-w-0 flex-1 truncate text-body font-semibold text-text">
                {next.title}
              </span>
              <span className="tabular shrink-0 text-caption font-semibold text-text">
                {next.remaining}
              </span>
            </div>
            {next.progress != null && (
              <AppProgress
                className="mt-3"
                value={next.progress}
                accent={next.status === "critical" ? "danger" : next.status === "warning" ? "orange" : "green"}
                ariaLabel={`Progreso hacia ${next.title}`}
              />
            )}
            {next.remainingDetail && (
              <p className="mt-2 text-right text-caption text-text-muted">{next.remainingDetail}</p>
            )}
          </AppCard>
        )}

        <QuickActions carId={car.id} />

        <AppSection>
          <div className="grid grid-cols-2 gap-3">
            <Link href={`/coches/${car.id}/gastos`} className="block">
              <AppCard className="h-full">
                <p className="text-caption text-text-secondary">Gasto este mes</p>
                <p className="tabular mt-1 text-title font-bold text-text">
                  {formatCurrency(monthly.current)}
                </p>
                {spendDelta != null && (
                  <p
                    className="mt-1 text-caption"
                    style={{ color: spendDelta > 0 ? "var(--color-danger)" : "var(--color-green)" }}
                  >
                    {spendDelta > 0 ? "▲" : "▼"} {Math.abs(spendDelta)}% vs mes anterior
                  </p>
                )}
              </AppCard>
            </Link>

            <Link href={`/coches/${car.id}/insights`} className="block">
              <AppCard className="h-full">
                <p className="text-caption text-text-secondary">Consumo medio</p>
                <p className="tabular mt-1 text-title font-bold text-text">
                  {fuel.l100km != null ? `${formatConsumption(fuel.l100km)} L/100km` : "—"}
                </p>
                <p className="mt-1 text-caption text-text-muted">
                  {fuel.pricePerLiter != null
                    ? `Último: ${fuel.pricePerLiter.toFixed(3)} €/L`
                    : "Sin repostajes registrados"}
                </p>
              </AppCard>
            </Link>
          </div>
        </AppSection>
      </AppScreenMain>
    </>
  );
}
