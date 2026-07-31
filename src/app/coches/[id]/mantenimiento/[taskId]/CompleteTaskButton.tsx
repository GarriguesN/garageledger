"use client";

// Botón "Marcar como realizado" del mockup 11.
//
// Pide confirmación con los datos que va a escribir (km y fecha) porque la
// acción no es trivial: cierra la tarea, sube el cuentakilómetros del coche
// y, si es recurrente, programa la siguiente. Mejor enseñar eso antes que
// explicarlo después.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppButton, AppModal, AppInput, AppDatePicker } from "@/components/ui";
import { formatKm } from "@/lib/format";

export interface CompleteTaskButtonProps {
  taskId: number;
  carId: number;
  currentKm: number;
  /** La tarea se repite sola: al cerrarla se programará la siguiente. */
  recurring: boolean;
}

export default function CompleteTaskButton({
  taskId, carId, currentKm, recurring,
}: CompleteTaskButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [km, setKm] = useState(String(currentKm));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    const kmValue = Number.parseInt(km, 10);
    if (!Number.isFinite(kmValue) || kmValue < 0) {
      setError("Introduce un kilometraje válido");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          id: taskId,
          currentKm: kmValue,
          currentDate: date,
          scheduleNext: recurring,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo completar el mantenimiento");
      }
      setOpen(false);
      router.replace(`/coches/${carId}/mantenimiento`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar el mantenimiento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AppButton size="lg" onClick={() => setOpen(true)}>
        Marcar como realizado
      </AppButton>

      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title="Marcar como realizado"
        footer={
          <AppButton size="lg" onClick={handleComplete} loading={saving} disabled={saving}>
            {saving ? "Guardando…" : "Confirmar"}
          </AppButton>
        }
      >
        <div className="space-y-4">
          <AppDatePicker
            label="Fecha de realización"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <AppInput
            label="Kilómetros"
            inputMode="numeric"
            suffix="km"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            hint={
              Number.parseInt(km, 10) > currentKm
                ? `Se actualizará el cuentakilómetros del coche a ${formatKm(Number.parseInt(km, 10))}.`
                : undefined
            }
          />
          {recurring && (
            <p className="text-caption text-text-secondary">
              Al confirmar se programará automáticamente el siguiente según su intervalo.
            </p>
          )}
          {error && (
            <p role="alert" className="text-caption text-danger">
              {error}
            </p>
          )}
        </div>
      </AppModal>
    </>
  );
}
