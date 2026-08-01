"use client";

// Las tres pestañas de la pantalla 7. El contenido llega ya resuelto desde el
// Server Component; aquí solo vive cuál está activa, así que el cambio de
// pestaña es instantáneo y no dispara ninguna petición.

import { useState } from "react";
import {
  AppTabs, AppMaintenanceCard, AppEmptyState, AppCard, AppIconChip,
} from "@/components/ui";
import type { MaintenanceView } from "@/lib/ui/maintenance";
import { formatDate, formatKm } from "@/lib/format";

export interface CompletedEntry {
  id: number;
  title: string;
  icon: MaintenanceView["icon"];
  date: string | null;
  km: number | null;
}

export interface MaintenanceTabsProps {
  carId: number;
  upcoming: MaintenanceView[];
  scheduled: MaintenanceView[];
  history: CompletedEntry[];
}

const TABS = [
  { id: "upcoming", label: "Próximos" },
  { id: "history", label: "Historial" },
  { id: "scheduled", label: "Programados" },
];

export default function MaintenanceTabs({
  carId, upcoming, scheduled, history,
}: MaintenanceTabsProps) {
  const [active, setActive] = useState("upcoming");

  return (
    <>
      <AppTabs tabs={TABS} active={active} onChange={setActive} layoutGroup="maintenance" />

      <div className="mt-4 space-y-3">
        {active === "upcoming" &&
          (upcoming.length === 0 ? (
            <AppEmptyState
              icon="wrench"
              title="Nada pendiente"
              description="No hay mantenimientos próximos ni vencidos para este vehículo."
            />
          ) : (
            upcoming.map((v) => (
              <AppMaintenanceCard
                key={v.id}
                icon={v.icon}
                title={v.title}
                frequency={v.frequency}
                remaining={v.remaining}
                remainingDetail={v.remainingDetail}
                status={v.status}
                href={`/coches/${carId}/mantenimiento/${v.id}`}
              />
            ))
          ))}

        {active === "scheduled" &&
          (scheduled.length === 0 ? (
            <AppEmptyState
              icon="calendar"
              title="Sin mantenimientos recurrentes"
              description="Las tareas con intervalo de km o meses aparecerán aquí."
            />
          ) : (
            scheduled.map((v) => (
              <AppMaintenanceCard
                key={v.id}
                icon={v.icon}
                title={v.title}
                frequency={v.frequency}
                remaining={v.remaining}
                remainingDetail={v.remainingDetail}
                status={v.status}
                href={`/coches/${carId}/mantenimiento/${v.id}`}
              />
            ))
          ))}

        {active === "history" &&
          (history.length === 0 ? (
            <AppEmptyState
              icon="clock"
              title="Todavía sin historial"
              description="Cuando marques un mantenimiento como realizado, quedará registrado aquí."
            />
          ) : (
            history.map((h) => (
              <AppCard key={h.id} className="flex items-center gap-3">
                <AppIconChip icon={h.icon} accent="green" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-text">{h.title}</span>
                  <span className="mt-0.5 block text-caption text-text-muted">
                    {formatDate(h.date)}
                  </span>
                </span>
                {h.km != null && (
                  <span className="tabular shrink-0 text-caption text-text-secondary">
                    {formatKm(h.km)}
                  </span>
                )}
              </AppCard>
            ))
          ))}
      </div>
    </>
  );
}
