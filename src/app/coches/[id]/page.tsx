// Pantalla 2 del mockup: Resumen del vehículo.
//
// Once secciones, en este orden y sin nada más entre ellas:
//
//   1 barra de navegación      7 accesos rápidos
//   2 identidad del vehículo   8 avisos
//   3 foto protagonista        9 próximos eventos
//   4 puntuación flotante     10 estadísticas
//   5 estado                  11 información del vehículo
//   6 próximo mantenimiento
//
// Las cinco primeras las monta <CarHero>, porque forman una sola pieza
// visual: la puntuación flota entre la foto y el estado y necesita conocer
// el borde donde se tocan.
//
// Es un Server Component: los datos se leen directamente de src/lib/db/* sin
// pasar por la API ni por un useEffect, así que el HTML llega ya con la
// puntuación y el próximo mantenimiento. Solo son cliente las piezas que
// realmente interactúan (héroe con imagen, accesos rápidos).
//
// Aquí no hay gráficas, ni historial, ni resúmenes de gasto: eso vive en
// Insights, en Actividad y en Gastos. Esta pantalla es el coche.

import {
  AppHeader, AppSection, AppCard, AppIconChip, AppProgress,
  AppEventTimeline, AppStatTile,
} from "@/components/ui";
import type { SpecRow } from "@/components/ui";
import { AppScreenMain } from "@/components/ui/AppLayout";
import { requireCar } from "./lib/loadCar";
import CarHero from "./components/CarHero";
import QuickActions from "./components/QuickActions";
import CarOptionsMenu from "./components/CarOptionsMenu";
import AlertsSection from "./components/AlertsSection";
import VehicleInfoSection from "./components/VehicleInfoSection";
import { computeCarScore } from "@/lib/db/score";
import { getMaintenanceTasks } from "@/lib/db/maintenance";
import {
  getFuelConsumption, getTotalCostPerKm, getYearSpend, getCarMetrics,
} from "@/lib/db/metrics";
import { toMaintenanceView, sortByUrgency } from "@/lib/ui/maintenance";
import { toAlertViews } from "@/lib/ui/alerts";
import { upcomingEvents } from "@/lib/ui/events";
import { CONDITION_ACCENT, vehiclePhotoUrl, vehicleName } from "@/lib/ui/vehicle";
import type { AccentToken, StatusToken } from "@/design/tokens";
import {
  formatCurrency, formatDecimal, formatConsumption, formatNumber, formatKm,
  formatDate,
} from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Color de una tarea según lo cerca que esté de vencer. */
const STATUS_ACCENT: Record<StatusToken, AccentToken> = {
  ok: "green",
  warning: "orange",
  critical: "danger",
  neutral: "blue",
};

export default async function CarSummaryPage({ params }: PageProps) {
  const car = await requireCar(params);

  const score = computeCarScore(car.id);
  const accent = CONDITION_ACCENT[score.condition];

  const tasks = getMaintenanceTasks(car.id);
  const views = sortByUrgency(tasks.map((t) => toMaintenanceView(t, car.km_actuales)));
  const next = views[0];

  // Sección 8. La sección enseña tres y guarda el resto tras "Ver todos":
  // una lista larga de avisos en la portada del coche convierte el resumen
  // en una bandeja de entrada.
  const alerts = toAlertViews(car.id, getCarMetrics(car.id).alerts, car);

  // Sección 9: mantenimientos y trámites mezclados, lo más próximo primero.
  const events = upcomingEvents(car, views);

  // Sección 10.
  const fuel = getFuelConsumption(car.id);
  const costPerKm = getTotalCostPerKm(car.id);
  const yearSpend = getYearSpend(car.id);

  // Sección 2: "2009 • 1.8 i-VTEC • 0016GMP".
  const specLine = [
    car.ano ? String(car.ano) : null,
    car.motor || null,
    car.matricula || null,
  ]
    .filter(Boolean)
    .join(" • ");

  // Sección 11: la ficha técnica. Las siete filas del mockup en la tarjeta y
  // todo lo registrado en la hoja de "Ver más detalles". Las filas sin dato
  // se caen: siete guiones seguidos no informan de nada.
  const withValue = (rows: SpecRow[]) =>
    rows.filter((row) => row.value != null && row.value !== "");

  const motor = [car.motor, car.potencia_cv ? `(${car.potencia_cv} CV)` : null]
    .filter(Boolean)
    .join(" ");

  const specs = withValue([
    { label: "Modelo", value: [vehicleName(car), car.generacion].filter(Boolean).join(" ") },
    { label: "Año", value: car.ano },
    { label: "Motor", value: motor },
    { label: "Combustible", value: car.combustible },
    { label: "Transmisión", value: car.transmision },
    { label: "Matrícula", value: car.matricula },
    { label: "VIN", value: car.bastidor },
  ]);

  const allSpecs = withValue([
    ...specs,
    { label: "Tracción", value: car.traccion },
    { label: "Cilindrada", value: car.cilindrada_cc ? `${formatNumber(car.cilindrada_cc)} cc` : null },
    { label: "Puertas", value: car.puertas },
    { label: "Plazas", value: car.plazas },
    { label: "Peso", value: car.peso_kg ? `${formatNumber(car.peso_kg)} kg` : null },
    { label: "Color", value: car.color },
    { label: "Kilometraje", value: formatKm(car.km_actuales) },
    { label: "Matriculación", value: car.fecha_matriculacion ? formatDate(car.fecha_matriculacion) : null },
    { label: "Última ITV", value: car.fecha_ultima_itv ? formatDate(car.fecha_ultima_itv) : null },
    { label: "Seguro hasta", value: car.fecha_vencimiento_seguro ? formatDate(car.fecha_vencimiento_seguro) : null },
    { label: "IVTM", value: car.fecha_ivtm ? formatDate(car.fecha_ivtm) : null },
  ]);

  return (
    <>
      {/* 1. Navegación */}
      <AppHeader
        title={vehicleName(car)}
        align="center"
        back="/"
        trailing={<CarOptionsMenu carId={car.id} carName={vehicleName(car)} />}
      />

      {/* Sin `pt-2`: la foto arranca pegada a la cabecera para que se quede
          pinchada detrás de ella al desplazar. El resto del contenido va
          dentro del héroe, que es quien lo hace pasar por encima. */}
      <AppScreenMain hasBottomNav>
        {/* 2-5. Identidad, foto, puntuación y estado. */}
        <CarHero
          photoUrl={vehiclePhotoUrl(car.foto_attachment_id)}
          name={vehicleName(car)}
          trim={car.generacion || null}
          specLine={specLine || null}
          score={score.score}
          scoreAccent={accent}
          conditionLabel={`${score.label} estado`}
          summary={score.summary}
        >
          {/* 6. Próximo mantenimiento: uno solo, el más urgente. */}
          {next && (
            <AppCard>
              <p className="text-caption text-text-secondary">Próximo mantenimiento</p>
              <div className="mt-3 flex items-center gap-3">
                <AppIconChip icon={next.icon} accent={STATUS_ACCENT[next.status]} />
                <span className="min-w-0 flex-1 truncate text-body font-semibold text-text">
                  {next.title}
                </span>
                <span className="shrink-0 text-right">
                  {next.remaining && (
                    <span className="tabular block text-body font-semibold text-text">
                      {next.remaining}
                    </span>
                  )}
                  {next.remainingDetail && (
                    <span className="block text-caption text-text-muted">
                      {next.remainingDetail}
                    </span>
                  )}
                </span>
              </div>
              {next.progress != null && (
                <AppProgress
                  className="mt-3"
                  value={next.progress}
                  accent={STATUS_ACCENT[next.status]}
                  ariaLabel={`Progreso de ${next.title}`}
                />
              )}
            </AppCard>
          )}

          {/* 7. Accesos rápidos. */}
          <QuickActions carId={car.id} />

          {/* 8. Avisos. */}
          {alerts.length > 0 && <AlertsSection alerts={alerts} />}

          {/* 9. Próximos eventos. */}
          {events.length > 0 && (
            <AppSection
              title="Próximos eventos"
              actionLabel="Ver calendario"
              actionHref={`/coches/${car.id}/mantenimiento`}
            >
              <AppEventTimeline events={events} />
            </AppSection>
          )}

          {/* 10. Estadísticas. Cada casilla lleva a la pantalla que
              desarrolla su dato: lo que se mide (km, consumo) a Insights; lo
              que se gasta (importe, coste por km) a Gastos. */}
          <AppSection title="Estadísticas">
            <div className="grid grid-cols-2 gap-3">
              <AppStatTile
                icon="gauge"
                accent="green"
                value={formatNumber(car.km_actuales)}
                unit="km"
                label="Kilometraje total"
                href={`/coches/${car.id}/insights`}
              />
              <AppStatTile
                icon="euro"
                accent="primary"
                value={formatCurrency(yearSpend)}
                label="Gasto total (este año)"
                href={`/coches/${car.id}/gastos`}
              />
              <AppStatTile
                icon="fuel"
                accent="orange"
                value={formatConsumption(fuel.l100km)}
                unit="L/100km"
                label="Consumo medio"
                href={`/coches/${car.id}/insights`}
              />
              <AppStatTile
                icon="trendUp"
                accent="blue"
                value={formatDecimal(costPerKm)}
                unit="€/km"
                label="Coste medio"
                href={`/coches/${car.id}/gastos`}
              />
            </div>
          </AppSection>

          {/* 11. Información del vehículo. */}
          <VehicleInfoSection
            rows={specs}
            allRows={allSpecs}
            editHref={`/coches/${car.id}/editar`}
          />
        </CarHero>
      </AppScreenMain>
    </>
  );
}
