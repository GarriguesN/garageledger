"use client";

// Los tres puntos de la cabecera del vehículo: editar y archivar.
//
// Archivar es un borrado suave —el coche sale del garaje pero sus gastos,
// mantenimientos y documentos siguen ahí—, así que se pide confirmación y se
// dice exactamente eso. Borrar de verdad no está en este menú a propósito:
// una acción irreversible no debe quedar a un toque de la que no lo es.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppMenu, AppModal, AppButton } from "@/components/ui";

export default function CarOptionsMenu({
  carId,
  carName,
}: {
  carId: number;
  carName: string;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function archive() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/cars", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: carId, archivado: 1 }),
      });
      if (!res.ok) throw new Error("No se pudo archivar el vehículo");
      setConfirm(false);
      // Al garaje: la pantalla que se está mirando ya no lista este coche.
      // El refresco va ANTES del salto: hacerlo después aborta la navegación
      // en curso —vuelve a renderizar la ruta actual— y uno se queda en la
      // ficha del coche que acaba de archivar.
      router.refresh();
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo archivar el vehículo");
      setSaving(false);
    }
  }

  return (
    <>
      <AppMenu
        label="Opciones del vehículo"
        items={[
          { label: "Editar", icon: "edit", href: `/coches/${carId}/editar` },
          {
            label: "Archivar",
            icon: "delete",
            destructive: true,
            onClick: () => setConfirm(true),
          },
        ]}
      />

      <AppModal open={confirm} onClose={() => setConfirm(false)} title="Archivar vehículo">
        <p className="text-body text-text-secondary">
          {carName} dejará de aparecer en el garaje. Su historial de gastos,
          mantenimientos y documentos se conserva y puedes recuperarlo cuando
          quieras.
        </p>
        {error && <p className="mt-3 text-body text-danger">{error}</p>}

        <div className="mt-6 flex gap-3">
          <AppButton
            variant="secondary"
            className="flex-1"
            onClick={() => setConfirm(false)}
          >
            Cancelar
          </AppButton>
          <AppButton variant="danger" className="flex-1" onClick={archive} loading={saving}>
            Archivar
          </AppButton>
        </div>
      </AppModal>
    </>
  );
}
