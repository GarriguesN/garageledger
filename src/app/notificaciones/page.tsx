// Avisos de todos los vehículos: ITV, seguro, impuesto y mantenimientos
// vencidos o próximos. Es el destino de la campana de la cabecera.
//
// El mockup no dibuja esta pantalla —solo el punto rojo de la campana—, así
// que el diseño se deriva del sistema: las alertas se pintan con la misma
// tarjeta que un mantenimiento, agrupadas por vehículo, y cada una enlaza al
// coche que la ha provocado.

import { cookies } from "next/headers";
import { AppSection, AppMaintenanceCard, AppEmptyState } from "@/components/ui";
import GarageShell from "../components/GarageShell";
import { getCars } from "@/lib/db/cars";
import { getCarMetrics } from "@/lib/db/metrics";
import { readSessionFromValue } from "@/lib/auth";
import { vehicleName } from "@/lib/ui/vehicle";
import type { StatusToken } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";

export const dynamic = "force-dynamic";

/** La severidad de la alerta decide color e icono. */
const SEVERITY: Record<string, { status: StatusToken; icon: IconName }> = {
  critical: { status: "critical", icon: "warning" },
  warning: { status: "warning", icon: "clock" },
  info: { status: "neutral", icon: "info" },
};

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const session = readSessionFromValue(cookieStore.get("gl_sess")?.value);

  const groups = session
    ? getCars()
        .map((car) => ({ car, alerts: getCarMetrics(car.id).alerts }))
        .filter((g) => g.alerts.length > 0)
    : [];

  const total = groups.reduce((n, g) => n + g.alerts.length, 0);

  return (
    <GarageShell title="Notificaciones" hasAlerts={total > 0}>
      {total === 0 ? (
        <AppEmptyState
          icon="success"
          accent="green"
          title="Todo en orden"
          description="No hay ITV, seguros ni mantenimientos pendientes en tus vehículos."
        />
      ) : (
        <div className="space-y-6 pt-2">
          {groups.map(({ car, alerts }) => (
            <AppSection key={car.id} title={vehicleName(car)}>
              <div className="space-y-3">
                {alerts.map((alert, i) => {
                  const severity = SEVERITY[alert.type] ?? SEVERITY.info;
                  return (
                    <AppMaintenanceCard
                      key={`${car.id}-${i}`}
                      icon={severity.icon}
                      title={alert.message}
                      status={severity.status}
                      href={
                        alert.task_id
                          ? `/coches/${car.id}/mantenimiento/${alert.task_id}`
                          : `/coches/${car.id}`
                      }
                    />
                  );
                })}
              </div>
            </AppSection>
          ))}
        </div>
      )}
    </GarageShell>
  );
}
