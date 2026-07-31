// Alta de un mantenimiento programado (destino del icono de calendario de la
// pantalla 7).

import { AppHeader } from "@/components/ui";
import { AppScreenMain } from "@/components/ui/AppLayout";
import { requireCar } from "../../lib/loadCar";
import MaintenanceWizard from "./MaintenanceWizard";

export const dynamic = "force-dynamic";

export default async function NewMaintenancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const car = await requireCar(params);

  return (
    <>
      <AppHeader
        title="Programar mantenimiento"
        align="center"
        back={`/coches/${car.id}/mantenimiento`}
      />
      <AppScreenMain hasBottomNav className="pt-2">
        <MaintenanceWizard carId={car.id} currentKm={car.km_actuales} />
      </AppScreenMain>
    </>
  );
}
