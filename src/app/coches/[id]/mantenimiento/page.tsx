// Pantalla 7 del mockup: Mantenimiento, con tres pestañas.
//
//   Próximos    tareas abiertas ordenadas por urgencia (vencidas primero).
//   Historial   tareas ya realizadas, de la más reciente a la más antigua.
//   Programados tareas abiertas que se repiten solas, es decir, las que
//               tienen intervalo de km o de meses. Una tarea puntual
//               ("arreglar la parrilla") no es un programa de mantenimiento
//               y por eso no sale aquí, aunque sí en Próximos.

import { AppHeader } from "@/components/ui";
import { AppScreenMain } from "@/components/ui/AppLayout";
import { requireCar } from "../lib/loadCar";
import { getMaintenanceTasks } from "@/lib/db/maintenance";
import { toMaintenanceView, sortByUrgency, maintenanceIcon } from "@/lib/ui/maintenance";
import MaintenanceTabs, { type CompletedEntry } from "./MaintenanceTabs";

export const dynamic = "force-dynamic";

export default async function MaintenancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const car = await requireCar(params);

  const all = getMaintenanceTasks(car.id, true);
  const open = all.filter((t) => t.completed === 0);
  const done = all.filter((t) => t.completed === 1);

  const upcoming = sortByUrgency(open.map((t) => toMaintenanceView(t, car.km_actuales)));
  const scheduled = upcoming.filter((v) => {
    const task = open.find((t) => t.id === v.id);
    return !!(task?.interval_km || task?.interval_months);
  });

  const history: CompletedEntry[] = done
    .sort((a, b) => (b.current_date ?? "").localeCompare(a.current_date ?? ""))
    .map((t) => ({
      id: t.id,
      title: t.part_name,
      icon: maintenanceIcon(t),
      date: t.current_date,
      km: t.current_km,
    }));

  return (
    <>
      <AppHeader
        title="Mantenimiento"
        actions={[
          {
            icon: "calendar",
            label: "Programar mantenimiento",
            href: `/coches/${car.id}/mantenimiento/nuevo`,
          },
        ]}
      />
      <AppScreenMain hasBottomNav className="pt-2">
        <MaintenanceTabs
          carId={car.id}
          upcoming={upcoming}
          scheduled={scheduled}
          history={history}
        />
      </AppScreenMain>
    </>
  );
}
