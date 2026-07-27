"use client";

// Modal para completar una tarea de mantenimiento. Sustituye al antiguo
// window.prompt() — Ticket 1.14. Mismo patrón que el <Modal> genérico.
//
// audit:M-5 — Reemplazado document.querySelector por useState para
// km y date. Fix del bug donde el input de fecha mostraba vacío cuando
// carKm > 0.

import { useState } from "react";
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
  // audit:M-5 — Estado local en vez de document.querySelector.
  const [km, setKm] = useState(carKm);
  const [date, setDate] = useState(today);

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
            value={km || ""}
            onChange={(e) => {
              const v = parseInt(e.target.value) || 0;
              setKm(v);
              onChange(v, date);
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
            type="date" style={{maxWidth:"84.5%"}}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              onChange(km, e.target.value);
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
          disabled={saving || !km}
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
