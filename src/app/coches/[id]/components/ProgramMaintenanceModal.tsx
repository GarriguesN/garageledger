"use client";

// Modal para crear una nueva tarea de mantenimiento programado.
//
// PUNTO 5 del ticket grande: el mockup añade un botón "Programar
// mantenimiento" junto a "+ Añadir gasto". Este modal implementa el
// formulario real con el mismo patrón visual que AddExpenseForm.tsx:
//   - header con icono + título
//   - campos con input-wrapper + input-icon
//   - footer con Guardar / Cancelar
//
// El submit hace POST /api/maintenance sin action="complete" (esa es la
// rama de `createMaintenanceTask` que ya existe en route.ts). La
// responsabilidad de refrescar datos y mostrar toast vive en el padre
// (`CarDetailClient`) — este componente sólo gestiona el formulario.

import {
  Calendar, Wrench, Hash, FileText, Gauge, Clock, History,
} from "lucide-react";

export interface ProgramMaintenanceFormState {
  part_name: string;
  current_km: string;
  next_km: string;
  next_date: string;
  interval_km: string;
  part_brand: string;
}

interface ProgramMaintenanceModalProps {
  form: ProgramMaintenanceFormState;
  saving: boolean;
  error?: string | null;
  onChange: (next: ProgramMaintenanceFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const TEXT_DARK = "#211a1e";
const TEXT_GRAY = "#8a8588";

export default function ProgramMaintenanceModal({
  form, saving, error, onChange, onSubmit, onCancel,
}: ProgramMaintenanceModalProps) {
  return (
    <div className="card space-y-4 mb-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Wrench size={14} style={{ color: "var(--accent)" }} />
        Programar mantenimiento
      </h3>

      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">
          Nombre de la pieza *
        </label>
        <div className="input-wrapper">
          <span className="input-icon"><Wrench size={16} /></span>
          <input
            className="input"
            placeholder="Ej. Pastillas de freno"
            value={form.part_name}
            onChange={(e) => onChange({ ...form, part_name: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">
          Km realizado
          <span className="ml-1 text-[10px] text-[var(--text-muted)]">
            (a qué km se hizo esta intervención)
          </span>
        </label>
        <div className="input-wrapper">
          <span className="input-icon"><History size={16} /></span>
          <input
            className="input"
            type="number"
            min="0"
            placeholder="Ej. 100000"
            value={form.current_km}
            onChange={(e) => onChange({ ...form, current_km: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">
            Próximo km
          </label>
          <div className="input-wrapper">
            <span className="input-icon"><Gauge size={16} /></span>
            <input
              className="input"
              type="number"
              min="0"
              placeholder="Ej. 120000"
              value={form.next_km}
              onChange={(e) => onChange({ ...form, next_km: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">
            Próxima fecha
          </label>
          <div className="input-wrapper">
            <span className="input-icon"><Calendar size={16} /></span>
            <input
              className="input"
              type="date"
              value={form.next_date}
              onChange={(e) => onChange({ ...form, next_date: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">
            Intervalo (km)
          </label>
          <div className="input-wrapper">
            <span className="input-icon"><Clock size={16} /></span>
            <input
              className="input"
              type="number"
              min="1"
              placeholder="Ej. 20000"
              value={form.interval_km}
              onChange={(e) => onChange({ ...form, interval_km: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">
            Marca / nota
          </label>
          <div className="input-wrapper">
            <span className="input-icon"><Hash size={16} /></span>
            <input
              className="input"
              placeholder="Brembo, Mann..."
              value={form.part_brand}
              onChange={(e) => onChange({ ...form, part_brand: e.target.value })}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs" style={{ color: "#c3423f" }}>{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          className="btn btn-primary flex-1 h-11 rounded-xl text-sm font-semibold"
          style={{ background: "var(--accent)", color: "#fff" }}
          onClick={onSubmit}
          disabled={saving}
        >
          {saving ? "Guardando…" : "Guardar"}
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

// Helper exportado: estado inicial vacío. El padre (CarDetailClient)
// también lo usa para resetear el formulario al cancelar.
export function emptyProgramMaintenanceForm(): ProgramMaintenanceFormState {
  return {
    part_name: "",
    current_km: "",
    next_km: "",
    next_date: "",
    interval_km: "",
    part_brand: "",
  };
}
