"use client";

import { useRef, useState } from "react";
import { fetchJsonWithToast, type ToastFn } from "../lib/net";
import {
  emptyProgramMaintenanceForm, type ProgramMaintenanceFormState,
} from "../components/ProgramMaintenanceFormBody";
import type { Car, MaintenanceTask } from "../lib/types";

// Extraído de CarDetailClient (Ticket: reducir el "god component").
// Estado + handlers de "Programar mantenimiento": crear/editar tarea vía
// modal, y borrar (con confirm o con undo vía swipe).

interface UseMaintenanceFormArgs {
  carId: number;
  car: Car;
  initialCar: Car;
  load: () => void;
  setToast: ToastFn;
  showToast: (msg: string, type?: "success" | "error", ms?: number) => void;
  showUndoToast: (msg: string, restore: () => Promise<void>) => void;
}

export function useMaintenanceForm({
  carId, car, initialCar, load, setToast, showToast, showUndoToast,
}: UseMaintenanceFormArgs) {
  const [showProgramMaintenance, setShowProgramMaintenance] = useState(false);
  const [editingMaintenanceId, setEditingMaintenanceId] = useState<number | null>(null);
  const [programForm, setProgramForm] = useState<ProgramMaintenanceFormState>(
    emptyProgramMaintenanceForm(initialCar.km_actuales)
  );
  const [programSaving, setProgramSaving] = useState(false);
  const [programError, setProgramError] = useState<string | null>(null);

  const programSubmittingRef = useRef(false);

  const openProgramMaintenance = () => {
    setEditingMaintenanceId(null);
    setProgramError(null);
    setProgramForm(emptyProgramMaintenanceForm(car?.km_actuales ?? initialCar.km_actuales));
    setShowProgramMaintenance(true);
  };

  const editMaintenanceTask = (task: MaintenanceTask) => {
    setEditingMaintenanceId(task.id);
    setProgramForm({
      part_name: task.part_name,
      current_km: task.current_km != null ? String(task.current_km) : "",
      next_km: task.next_km != null ? String(task.next_km) : "",
      next_date: task.next_date || "",
      interval_km: task.interval_km != null ? String(task.interval_km) : "",
      interval_months: task.interval_months != null ? String(task.interval_months) : "",
      part_brand: task.part_brand || "",
      preset_key: task.preset_key || "",
    });
    setProgramError(null);
    setShowProgramMaintenance(true);
  };

  const closeProgramMaintenance = () => {
    setEditingMaintenanceId(null);
    setProgramError(null);
    setShowProgramMaintenance(false);
  };

  const submitProgramMaintenance = async () => {
    if (programSubmittingRef.current) return;
    setProgramError(null);
    const part_name = programForm.part_name.trim();
    if (!part_name) {
      setProgramError("Introduce el nombre de la pieza.");
      return;
    }
    const hasKm = programForm.next_km.trim() !== "";
    const hasDate = programForm.next_date.trim() !== "";
    if (!hasKm && !hasDate) {
      setProgramError("Indica al menos un próximo km o una próxima fecha.");
      return;
    }
    programSubmittingRef.current = true;
    setProgramSaving(true);
    try {
      // current_km es opcional. Si el usuario no lo rellena, usamos
      // el km actual del coche para que la fila "Realizado: X km" no
      // quede huérfana.
      const carKm = car?.km_actuales ?? initialCar.km_actuales ?? 0;
      const currentKmRaw = programForm.current_km.trim();
      const currentKm = currentKmRaw === ""
        ? (carKm > 0 ? carKm : null)
        : parseInt(currentKmRaw);
      const body: Record<string, unknown> = {
        carId,
        part_name,
        part_brand: programForm.part_brand.trim() || null,
        current_km: currentKm,
        next_km: hasKm ? parseInt(programForm.next_km) : null,
        next_date: hasDate ? programForm.next_date : null,
        interval_km: programForm.interval_km.trim()
          ? parseInt(programForm.interval_km)
          : null,
        interval_months: programForm.interval_months.trim()
          ? parseInt(programForm.interval_months)
          : null,
        icon_key: programForm.preset_key.trim() || null,
        preset_key: programForm.preset_key.trim() || null,
      };
      const method = editingMaintenanceId ? "PUT" : "POST";
      const url = editingMaintenanceId ? `/api/maintenance?id=${editingMaintenanceId}` : "/api/maintenance";
      const res = await fetchJsonWithToast(
        url,
        { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
          fallback: "No se pudo guardar el mantenimiento. Inténtalo de nuevo." },
        setToast,
      );
      if (!res.ok) return;
      setShowProgramMaintenance(false);
      // El form se reiniciará con el car.km_actuales actual cuando el
      // usuario vuelva a abrir el modal.
      setProgramForm(emptyProgramMaintenanceForm(car?.km_actuales ?? initialCar.km_actuales));
      showToast(`${part_name} programado`);
      load();
    } finally {
      setProgramSaving(false);
      programSubmittingRef.current = false;
    }
  };

  const deleteMaintenanceTaskWithUndo = async (task: MaintenanceTask) => {
    // Capturamos la tarea ANTES de borrarla para poder restaurarla.
    const snapshot = { ...task };
    const res = await fetchJsonWithToast(
      `/api/maintenance?id=${task.id}`,
      { method: "DELETE", headers: { "Content-Type": "application/json" },
        fallback: "No se pudo eliminar la tarea. Inténtalo de nuevo." },
      setToast,
    );
    if (!res.ok) return;
    // Ticket 1.16: undo real — recreamos vía POST con los datos originales.
    showUndoToast("Tarea eliminada", async () => {
      await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: carId,
          part_name: snapshot.part_name,
          part_brand: snapshot.part_brand || null,
          part_model: snapshot.part_model || null,
          current_km: snapshot.current_km,
          current_date: snapshot.current_date,
          next_km: snapshot.next_km,
          next_date: snapshot.next_date,
          interval_km: snapshot.interval_km,
          interval_months: snapshot.interval_months,
          notes: snapshot.notes || "",
          icon_key: snapshot.icon_key || null,
          preset_key: snapshot.preset_key || null,
        }),
      });
      load();
    });
    load();
  };

  const deleteMaintenanceTask = async (task: MaintenanceTask) => {
    if (!confirm(`Eliminar tarea "${task.part_name}"?`)) return;
    await deleteMaintenanceTaskWithUndo(task);
  };

  return {
    showProgramMaintenance, setShowProgramMaintenance,
    editingMaintenanceId,
    programForm, setProgramForm,
    programSaving, programError,
    openProgramMaintenance, editMaintenanceTask, closeProgramMaintenance,
    submitProgramMaintenance,
    deleteMaintenanceTask, deleteMaintenanceTaskWithUndo,
  };
}
