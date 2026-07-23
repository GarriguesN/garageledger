"use client";

// Modal para crear una nueva tarea de mantenimiento programado.
//
// PUNTO 5: dos modos de crear la tarea:
//   (a) Elegir un preset del catálogo (MaintenancePresets) → el modal
//       rellena part_name, interval_km, interval_months y fija el icono.
//   (b) Entrada libre — el usuario teclea todo.
//
// Tras seleccionar preset, el usuario puede sobrescribir cualquier
// campo. El campo `icon_key` se persiste en BD para que la fila use el
// icono del preset (no Wrench genérico).
//
// PUNTO 1.15: añade "Km realizado" con fallback a car.km_actuales.

import {
  Calendar, Wrench, Hash, Clock, History, ChevronDown,
} from "lucide-react";
import {
  groupPresetsByCategory, findPresetByKey,
} from "@/lib/maintenance/presets";

export interface ProgramMaintenanceFormState {
  part_name: string;
  current_km: string;
  next_km: string;
  next_date: string;
  interval_km: string;
  interval_months: string;
  part_brand: string;
  preset_key: string;
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
  const groups = groupPresetsByCategory();

  function onPresetChange(key: string) {
    if (key === "") {
      onChange({ ...form, preset_key: "" });
      return;
    }
    const preset = findPresetByKey(key);
    if (!preset) return;
    onChange({
      ...form,
      preset_key: key,
      part_name: preset.part_name,
      interval_km: preset.interval_km ? String(preset.interval_km) : form.interval_km,
      interval_months: preset.interval_months ? String(preset.interval_months) : form.interval_months,
    });
  }

  return (
    <div className="card space-y-4 mb-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Wrench size={14} style={{ color: "var(--accent)" }} />
        Programar mantenimiento
      </h3>

      {/* Selector de predefinidos */}
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">
          Elegir predefinido
          <span className="ml-1 text-[10px] text-[var(--text-muted)]">
            (opcional, autocompleta nombre e intervalo)
          </span>
        </label>
        <div className="relative">
          <select
            className="input appearance-none pr-9"
            value={form.preset_key}
            onChange={(e) => onPresetChange(e.target.value)}
          >
            <option value="">— Sin predefinido (entrada libre) —</option>
            {groups.map((g) => (
              <optgroup key={g.category} label={g.category}>
                {g.presets.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.part_name} — cada {p.interval_km > 0 ? `${(p.interval_km / 1000).toFixed(0)}.000 km` : "—"}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-muted)" }}
            aria-hidden
          />
        </div>
      </div>

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
            <span className="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m12 14 4-4" />
                <path d="M3.34 19a10 10 0 1 1 17.32 0" />
              </svg>
            </span>
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
              min="0"
              placeholder="Ej. 20000"
              value={form.interval_km}
              onChange={(e) => onChange({ ...form, interval_km: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">
            Intervalo (meses)
          </label>
          <div className="input-wrapper">
            <span className="input-icon"><Calendar size={16} /></span>
            <input
              className="input"
              type="number"
              min="0"
              placeholder="Ej. 12"
              value={form.interval_months}
              onChange={(e) => onChange({ ...form, interval_months: e.target.value })}
            />
          </div>
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

// Helper exportado: estado inicial vacío.
export function emptyProgramMaintenanceForm(): ProgramMaintenanceFormState {
  return {
    part_name: "",
    current_km: "",
    next_km: "",
    next_date: "",
    interval_km: "",
    interval_months: "",
    part_brand: "",
    preset_key: "",
  };
}
