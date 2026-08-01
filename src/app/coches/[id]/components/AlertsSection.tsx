"use client";

// Sección "Avisos" del resumen. En la pantalla caben tres; "Ver todos" no
// lleva a ninguna parte, sube una hoja con la lista completa: el usuario
// estaba mirando su coche y quiere ver el resto de avisos, no cambiar de
// pantalla y tener que volver.

import { useState } from "react";
import { AppSection, AppAlertCard, AppModal } from "@/components/ui";
import type { AlertView } from "@/lib/ui/alerts";

/** Cuántos avisos se ven sin abrir la hoja. */
const VISIBLE = 3;

export default function AlertsSection({ alerts }: { alerts: AlertView[] }) {
  const [open, setOpen] = useState(false);
  const visible = alerts.slice(0, VISIBLE);
  const hasMore = alerts.length > VISIBLE;

  return (
    <>
      <AppSection
        title="Avisos"
        actionLabel={hasMore ? `Ver todos (${alerts.length})` : undefined}
        onAction={() => setOpen(true)}
        className="space-y-3"
      >
        {visible.map((alert) => (
          <AppAlertCard
            key={alert.id}
            icon={alert.icon}
            accent={alert.accent}
            title={alert.title}
            detail={alert.detail}
            href={alert.href}
          />
        ))}
      </AppSection>

      <AppModal open={open} onClose={() => setOpen(false)} title="Avisos">
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AppAlertCard
              key={alert.id}
              icon={alert.icon}
              accent={alert.accent}
              title={alert.title}
              detail={alert.detail}
              href={alert.href}
            />
          ))}
        </div>
      </AppModal>
    </>
  );
}
