// Alta de un mantenimiento (destino del icono de calendario de la pantalla
// 7). El asistente trae su propia cabecera y su progreso.

import { requireCar } from "../../lib/loadCar";
import { getMaintenanceTasks } from "@/lib/db/maintenance";
import MaintenanceWizard from "@/components/wizards/MaintenanceWizard";

export const dynamic = "force-dynamic";

export default async function NewMaintenancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const car = await requireCar(params);

  // Talleres ya usados en tareas anteriores de este coche: casi siempre se
  // vuelve al mismo, así que ofrecerlos evita teclear.
  const workshops = [
    ...new Set(
      getMaintenanceTasks(car.id, true)
        .map((t) => t.part_brand)
        .filter((w) => w.trim() !== ""),
    ),
  ].slice(0, 8);

  return (
    <MaintenanceWizard carId={car.id} currentKm={car.km_actuales} workshops={workshops} />
  );
}
