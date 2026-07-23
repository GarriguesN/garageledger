"use client";

// Modal para completar una tarea de mantenimiento. Sustituye al antiguo
// window.prompt() — Ticket 1.14. Mismo patrón que el <Modal> genérico.
//
// Campos:
//   - Km actuales (prefilled con car.km_actuales, numérico, id="cm-km")
//   - Fecha actual (prefilled con hoy, date input, id="cm-date")
// Botones: Completar / Cancelar.

import { Gauge, Calendar } from "lucide-react";
import type { MaintenanceTask } from "@/lib/db/maintenance";

interface CompleteMaintenanceModalProps {
  task: MaintenanceTask;
  carKm: number;
  saving: boolean;
  onChange: (km: number, date: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export interface CompleteMaintenanceForm {
  km: number;
  date: string;
}

/** Estado inicial: siempre usa car.km_actuales y hoy. */
export function emptyCompleteMaintenanceForm(carKm: number): CompleteMaintenanceForm {
  return {
    km: carKm,
    date: new Date().toISOString().split("T")[0],
  };
}

export default function CompleteMaintenanceModal({
  task, carKm, saving,
  onChange, onSubmit, onCancel,
}: CompleteMaintenanceModalProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Vas a completar <strong>{task.part_name}</strong>.
        {task.part_brand ? ` (${task.part_brand})` : ""}
      </p>
      <p className="text-xs text-[var(--text-muted)]">
        Esto marcará la tarea como hecha y creará la siguiente programada
        automáticamente con el intervalo configurado.
      </p>

      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">
          Km actuales
        </label>
        <div className="input-wrapper">
          <span className="input-icon"><Gauge size={16} /></span>
          <input
            id="cm-km"
            className="input"
            type="number"
            min="0"
            value={carKm || ""}
            onChange={(e) => {
              const dt = (document.querySelector("#cm-date") as HTMLInputElement)?.value || today;
              onChange(parseInt(e.target.value) || 0, dt);
            }}
            autoFocus
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">
          Fecha actual
        </label>
        <div className="input-wrapper">
          <span className="input-icon"><Calendar size={16} /></span>
          <input
            id="cm-date"
            className="input"
            type="date"
            value={carKm ? "" : today}
            defaultValue={today}
            onChange={(e) => {
              const km = parseInt((document.querySelector("#cm-km") as HTMLInputElement)?.value || "0");
              onChange(km || carKm, e.target.value);
            }}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          className="btn btn-primary flex-1 h-11 rounded-xl text-sm font-semibold"
          style={{ background: "var(--accent)", color: "#fff" }}
          onClick={onSubmit}
          disabled={saving || !carKm}
        >
          {saving ? "Guardando…" : "Completar"}
        </button>
        <button
          type="button"
          className="btn btn-secondary flex-1 h-11 rounded-xl text-sm font-semibold"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
