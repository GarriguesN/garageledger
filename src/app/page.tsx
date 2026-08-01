// Pantalla 1 del mockup: Garaje.
//
// Es el selector de vehículos y la única pantalla que no tiene barra inferior
// contextual (esa solo existe dentro de un coche).
//
// Defensa en profundidad, heredada del diseño anterior y que se mantiene: se
// valida la cookie de sesión ANTES de tocar la base de datos. Sin sesión, la
// lista queda vacía y el HTML no contiene ni marca, ni matrícula, ni gastos;
// la PinGate del layout raíz se encarga de pedir el PIN. Así un `curl` sin
// cookie nunca ve datos, aunque alguien tocara la PinGate.

import { cookies } from "next/headers";
import { AppSection, AppVehicleCard, AppEmptyState, AppButton } from "@/components/ui";
import GarageShell from "./components/GarageShell";
import { getGarageVehicles } from "@/lib/db/garage";
import { readSessionFromValue } from "@/lib/auth";
import { formatCurrency, formatConsumption } from "@/lib/format";
import {
  CONDITION_ACCENT, vehiclePhotoUrl, vehicleSubtitle, vehicleName, vehicleMileage,
} from "@/lib/ui/vehicle";

export const dynamic = "force-dynamic";

export default async function GaragePage() {
  const cookieStore = await cookies();
  const session = readSessionFromValue(cookieStore.get("gl_sess")?.value);
  const vehicles = session ? getGarageVehicles() : [];

  const hasAlerts = vehicles.some((v) => v.score.factors.length > 0);

  return (
    <GarageShell title="Garaje" hasAlerts={hasAlerts}>
      {vehicles.length === 0 ? (
        <AppEmptyState
          icon="car"
          title="No hay vehículos"
          description="Añade tu primer vehículo para empezar a controlar sus gastos y mantenimientos."
          actionLabel="Añadir vehículo"
          actionHref="/coches/nuevo"
        />
      ) : (
        <div className="space-y-4 pt-2">
          <div className="flex justify-end">
            <AppButton href="/coches/nuevo" icon="plus" ariaLabel="Añadir vehículo">
              Añadir
            </AppButton>
          </div>

          <AppSection title="Mis vehículos">
            <div className="space-y-4">
              {vehicles.map(({ car, score, consumption }) => (
                <AppVehicleCard
                  key={car.id}
                  href={`/coches/${car.id}`}
                  name={vehicleName(car)}
                  trim={car.generacion || undefined}
                  subtitle={vehicleSubtitle(car)}
                  mileage={vehicleMileage(car)}
                  photoUrl={vehiclePhotoUrl(car.foto_attachment_id)}
                  status={{
                    label: score.label,
                    accent: CONDITION_ACCENT[score.condition],
                  }}
                  metrics={[
                    {
                      label: "Salud",
                      value: `${score.score}/100`,
                      accent: CONDITION_ACCENT[score.condition],
                    },
                    {
                      label: "Gasto/mes",
                      value: formatCurrency(car.gastoMensual),
                      accent: "primary",
                    },
                    {
                      label: "Consumo",
                      value:
                        consumption != null
                          ? `${formatConsumption(consumption)} L/100km`
                          : "—",
                      accent: "blue",
                    },
                  ]}
                />
              ))}
            </div>
          </AppSection>

          {/* Botón de contorno discontinuo del mockup, al final de la lista. */}
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
