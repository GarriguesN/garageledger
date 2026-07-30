"use client";

import { useState } from "react";
import { fetchJsonWithToast, type ToastFn } from "../lib/net";
import {
  emptyCompleteMaintenanceForm, type CompleteMaintenanceForm,
} from "../components/CompleteMaintenanceModal";
import type { Car, MaintenanceTask } from "../lib/types";

// Extraído de CarDetailClient (Ticket: reducir el "god component").
// Modal de "Completar mantenimiento" (Ticket 1.14, sustituye a window.prompt).

interface UseCompleteTaskArgs {
  car: Car;
  initialCar: Car;
  load: () => void;
  setToast: ToastFn;
  showToast: (msg: string, type?: "success" | "error", ms?: number) => void;
}

export function useCompleteTask({ car, initialCar, load, setToast, showToast }: UseCompleteTaskArgs) {
  const [taskToComplete, setTaskToComplete] = useState<MaintenanceTask | null>(null);
  const [completeForm, setCompleteForm] = useState<CompleteMaintenanceForm>(
    emptyCompleteMaintenanceForm(initialCar.km_actuales),
  );
  const [completing, setCompleting] = useState(false);

  const openCompleteTask = (task: MaintenanceTask) => {
    setCompleteForm(emptyCompleteMaintenanceForm(car?.km_actuales ?? initialCar.km_actuales));
    setTaskToComplete(task);
  };

  const submitCompleteTask = async () => {
    if (!taskToComplete) return;
    setCompleting(true);
    const res = await fetchJsonWithToast(
      "/api/maintenance",
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          id: taskToComplete.id,
          currentKm: completeForm.km,
          currentDate: completeForm.date,
        }),
        fallback: `No se pudo completar "${taskToComplete.part_name}". Inténtalo de nuevo.` },
      setToast,
    );
    setCompleting(false);
    if (!res.ok) return;
    showToast(`${taskToComplete.part_name} completado`);
    setTaskToComplete(null);
    load();
  };

  return {
    taskToComplete, setTaskToComplete,
    completeForm, setCompleteForm,
    completing,
    openCompleteTask, submitCompleteTask,
  };
}
