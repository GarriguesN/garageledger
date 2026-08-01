// Pantalla 11 del mockup: detalle de un mantenimiento.
//
// Cabecera de color con la pieza y su periodicidad, el próximo plazo, la
// última vez que se hizo, el historial completo y el botón de acción.

import { notFound } from "next/navigation";
import {
  AppHeader, AppCard, AppIconChip, AppBadge, AppDivider,
} from "@/components/ui";
import { AppScreenMain } from "@/components/ui/AppLayout";
import { requireCar } from "../../lib/loadCar";
import { getMaintenanceTask, getMaintenanceHistory } from "@/lib/db/maintenance";
import { toMaintenanceView } from "@/lib/ui/maintenance";
import { accentDim, accents } from "@/design/tokens";
import { formatDate, formatKm, formatCurrency } from "@/lib/format";
import CompleteTaskButton from "./CompleteTaskButton";

export const dynamic = "force-dynamic";

const STATUS_ACCENT = {
  ok: "green",
  warning: "orange",
  critical: "danger",
  neutral: "blue",
} as const;

export default async function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const car = await requireCar(params as Promise<{ id: string }>);
  const { taskId } = await params;

  const task = getMaintenanceTask(Number.parseInt(taskId, 10));
  // Comprobamos también el coche: un id de tarea de OTRO vehículo no debe
  // poder verse cambiando la URL.
  if (!task || task.car_id !== car.id) notFound();

  const view = toMaintenanceView(task, car.km_actuales);
  const accent = STATUS_ACCENT[view.status];
  const history = getMaintenanceHistory(car.id, {
    presetKey: task.preset_key,
    partName: task.part_name,
  });
  const recurring = !!(task.interval_km || task.interval_months);

  return (
    <>
      <AppHeader
        title="Mantenimiento"
        align="center"
        back={`/coches/${car.id}/mantenimiento`}
        actions={[{ icon: "more", label: "Opciones", href: `/coches/${car.id}/mantenimiento` }]}
      />

      <AppScreenMain hasBottomNav className="space-y-4 pt-2">
        {/* Cabecera teñida con el color del estado, como en el mockup. */}
        <div
          className="rounded-card p-4"
          style={{ backgroundColor: accentDim(accent, 0.12) }}
        >
          <div className="flex items-start gap-3">
            <AppIconChip icon={view.icon} accent={accent} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-title font-bold text-text">{view.title}</h2>
              {view.frequency && (
                <p className="mt-0.5 text-caption text-text-secondary">{view.frequency}</p>
              )}
              <div className="mt-2">
                <AppBadge accent={recurring ? "green" : "blue"} dot>
                  {recurring ? "Programado" : "Puntual"}
                </AppBadge>
              </div>
            </div>
          </div>
        </div>

        <AppCard>
          <p className="text-caption text-text-secondary">Próximo</p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <span
              className="tabular text-title font-bold"
              style={{ color: view.status === "critical" ? accents.danger : undefined }}
            >
              {view.remaining ?? "Sin plazo definido"}
            </span>
            {view.remainingDetail && (
              <span className="tabular text-caption text-text-secondary">
                {view.remainingDetail}
              </span>
            )}
          </div>

          {(task.current_date || task.current_km != null) && (
            <>
              <AppDivider className="my-4" />
              <p className="text-caption text-text-secondary">Último realizado</p>
              <div className="mt-1 flex items-baseline justify-between gap-3">
                <span className="tabular text-body font-semibold text-text">
                  {formatDate(task.current_date)}
                </span>
                {task.current_km != null && (
                  <span className="tabular text-body text-text-secondary">
                    {formatKm(task.current_km)}
                  </span>
                )}
              </div>
            </>
          )}
        </AppCard>

        {history.length > 0 && (
          <AppCard>
            <p className="mb-2 text-caption text-text-secondary">Historial</p>
            <ul>
              {history.map((h, i) => (
                <li key={h.id}>
                  {i > 0 && <AppDivider />}
                  <div className="flex items-baseline justify-between gap-3 py-3">
                    <span className="tabular text-body text-text">{formatDate(h.date)}</span>
                    <span className="tabular text-caption text-text-secondary">
                      {h.km != null ? formatKm(h.km) : "—"}
                    </span>
                    <span className="tabular w-16 text-right text-body font-semibold text-text">
                      {h.importe != null ? formatCurrency(h.importe) : "—"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </AppCard>
        )}

        {task.notes && (
          <AppCard>
            <p className="text-caption text-text-secondary">Notas</p>
            <p className="mt-1 text-body text-text">{task.notes}</p>
          </AppCard>
        )}

        <CompleteTaskButton
          taskId={task.id}
          carId={car.id}
          partName={task.part_name}
          currentKm={car.km_actuales}
          recurring={recurring}
        />
      </AppScreenMain>
    </>
  );
}
