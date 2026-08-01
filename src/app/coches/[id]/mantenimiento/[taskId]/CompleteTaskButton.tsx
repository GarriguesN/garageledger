"use client";

// Botón "Marcar como realizado" del mockup 11. Abre el asistente que cierra
// la tarea; la mecánica vive en él, aquí solo queda el disparador.

import { useState } from "react";
import { AppButton } from "@/components/ui";
import CompleteMaintenanceWizard from "@/components/wizards/CompleteMaintenanceWizard";

export interface CompleteTaskButtonProps {
  taskId: number;
  carId: number;
  partName: string;
  currentKm: number;
  /** La tarea se repite sola: al cerrarla se programará la siguiente. */
  recurring: boolean;
}

export default function CompleteTaskButton({
  taskId, carId, partName, currentKm, recurring,
}: CompleteTaskButtonProps) {
  const [open, setOpen] = useState(false);
  // Cambia en cada apertura para remontar el asistente: así empieza limpio
  // (paso y campos) sin necesidad de un efecto que resetee su estado.
  const [key, setKey] = useState(0);

  return (
    <>
      <AppButton
        size="lg"
        onClick={() => {
          setKey((k) => k + 1);
          setOpen(true);
        }}
      >
        Marcar como realizado
      </AppButton>

      <CompleteMaintenanceWizard
        key={key}
        open={open}
        onClose={() => setOpen(false)}
        taskId={taskId}
        carId={carId}
        partName={partName}
        currentKm={currentKm}
        recurring={recurring}
      />
    </>
  );
}
