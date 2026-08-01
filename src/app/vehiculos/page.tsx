// Pantalla 9 del mockup: lista compacta de vehículos.
//
// Es el garaje en formato lista: misma información, sin la foto grande ni las
// métricas, para poder cambiar de coche de un vistazo cuando hay varios.

import { cookies } from "next/headers";
import { AppSection, AppVehicleCard, AppEmptyState, AppButton } from "@/components/ui";
import GarageShell from "../components/GarageShell";
import { getGarageVehicles } from "@/lib/db/garage";
import { readSessionFromValue } from "@/lib/auth";
import {
  CONDITION_ACCENT, vehiclePhotoUrl, vehicleSubtitle, vehicleName, vehicleMileage,
} from "@/lib/ui/vehicle";

export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  const cookieStore = await cookies();
  const session = readSessionFromValue(cookieStore.get("gl_sess")?.value);
  const vehicles = session ? getGarageVehicles() : [];

  return (
    <GarageShell title="Mis vehículos">
      {vehicles.length === 0 ? (
        <AppEmptyState
          icon="car"
          title="No hay vehículos"
          description="Añade tu primer vehículo para empezar."
          actionLabel="Añadir vehículo"
          actionHref="/coches/nuevo"
        />
      ) : (
        <div className="space-y-4 pt-2">
          <AppSection title={`${vehicles.length} ${vehicles.length === 1 ? "vehículo" : "vehículos"}`}>
            <div className="space-y-3">
              {vehicles.map(({ car, score }) => (
                <AppVehicleCard
                  key={car.id}
                  variant="compact"
                  href={`/coches/${car.id}`}
                  name={vehicleName(car)}
                  subtitle={vehicleSubtitle(car)}
                  mileage={vehicleMileage(car)}
                  photoUrl={vehiclePhotoUrl(car.foto_attachment_id)}
                  status={{ label: score.label, accent: CONDITION_ACCENT[score.condition] }}
                />
              ))}
            </div>
          </AppSection>

          <AppButton
            href="/coches/nuevo"
            variant="secondary"
            size="lg"
            icon="plus"
            className="border-dashed"
          >
            Añadir vehículo
          </AppButton>
        </div>
      )}
    </GarageShell>
  );
}
