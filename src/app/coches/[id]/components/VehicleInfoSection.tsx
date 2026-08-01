"use client";

// Sección "Información del vehículo". La tarjeta enseña la ficha corta del
// mockup; "Ver más detalles" sube una hoja con todo lo que hay registrado
// del coche, incluidas las fechas legales y las medidas.
//
// Las dos listas se calculan en el servidor y llegan ya formateadas: aquí
// solo se decide cuál se está mirando.

import { useState } from "react";
import { AppSection, AppSpecList, AppModal, AppButton } from "@/components/ui";
import type { SpecRow } from "@/components/ui";

export default function VehicleInfoSection({
  rows,
  allRows,
  editHref,
}: {
  rows: SpecRow[];
  allRows: SpecRow[];
  editHref: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AppSection title="Información del vehículo">
        <AppSpecList
          rows={rows}
          actionLabel="Ver más detalles"
          onAction={() => setOpen(true)}
        />
      </AppSection>

      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title="Información del vehículo"
        footer={
          <AppButton href={editHref} size="lg" variant="secondary" icon="edit">
            Editar vehículo
          </AppButton>
        }
      >
        <dl className="space-y-3">
          {allRows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4">
              <dt className="shrink-0 text-body text-text-secondary">{row.label}</dt>
              <dd className="truncate text-body font-medium text-text">{row.value}</dd>
            </div>
          ))}
        </dl>
      </AppModal>
    </>
  );
}
