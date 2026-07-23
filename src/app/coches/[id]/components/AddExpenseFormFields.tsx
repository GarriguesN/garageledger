"use client";

// Campos del formulario "Añadir gasto". Sólo renderiza los inputs; el
// modal/overlay lo provee el padre (`CarDetailClient`) usando el componente
// genérico `<Modal>`. Esto deja la lógica de submit, validación y
// dependencias (maintenanceTasks) exactamente igual que antes — Ticket 1.13
// sólo cambia el contenedor, no la lógica.

import {
  Euro, Calendar, FileText, Hash, Fuel, Gauge, Wrench,
} from "lucide-react";
import {
  CATEGORIAS, isFuel, isDiy,
} from "../lib/format";
import type { AddExpenseFormState, MaintenanceTask } from "../lib/types";

interface AddExpenseFormProps {
  form: AddExpenseFormState;
  maintenanceTasks: MaintenanceTask[];
  saving: boolean;
  onChange: (next: AddExpenseFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function AddExpenseForm({
  form, maintenanceTasks, saving,
  onChange, onSubmit, onCancel,
}: AddExpenseFormProps) {
  const fuel = isFuel(form);
  const diy = isDiy(form);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">Tipo</label>
        <select
          className="input"
          value={form.tipo}
          onChange={(e) =>
            onChange({ ...form, tipo: e.target.value, costeTaller: "", selectedTask: "" })
          }
        >
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">Importe (€)</label>
        <div className="input-wrapper">
          <span className="input-icon"><Euro size={16} /></span>
          <input
            className="input"
            type="number" step="0.01" min="0" placeholder="0.00"
            value={form.importe}
            onChange={(e) => onChange({ ...form, importe: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">Fecha</label>
        <div className="input-wrapper">
          <span className="input-icon"><Calendar size={16} /></span>
          <input
            className="input"
            type="date"
            value={form.date}
            onChange={(e) => onChange({ ...form, date: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">Descripción</label>
        <div className="input-wrapper">
          <span className="input-icon"><FileText size={16} /></span>
          <input
            className="input"
            placeholder="Ej. Cambio de aceite"
            value={form.descripcion}
            onChange={(e) => onChange({ ...form, descripcion: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">Referencia / Ticket (opcional)</label>
        <div className="input-wrapper">
          <span className="input-icon"><Hash size={16} /></span>
          <input
            className="input"
            placeholder="Ej. FACT-2024-001"
            value={form.referencia}
            onChange={(e) => onChange({ ...form, referencia: e.target.value })}
          />
        </div>
      </div>
      {fuel && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Litros</label>
            <div className="input-wrapper">
              <span className="input-icon"><Fuel size={16} /></span>
              <input
                className="input"
                type="number" step="0.1" placeholder="Ej. 40"
                value={form.litros}
                onChange={(e) => onChange({ ...form, litros: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Km totales</label>
            <div className="input-wrapper">
              <span className="input-icon"><Gauge size={16} /></span>
              <input
                className="input"
                type="number" placeholder="Ej. 145000"
                value={form.km}
                onChange={(e) => onChange({ ...form, km: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
      {diy && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">
              Tarea de mantenimiento
            </label>
            <select
              className="input"
              value={form.selectedTask}
              onChange={(e) => {
                const task = maintenanceTasks.find((t) => t.id === parseInt(e.target.value));
                onChange({
                  ...form,
                  selectedTask: e.target.value,
                  descripcion: task ? task.part_name : form.descripcion,
                });
              }}
            >
              <option value="">-- Describelo manualmente --</option>
              {maintenanceTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.part_name}
                  {t.part_brand ? ` (${t.part_brand})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">
                Coste estimado taller (€)
              </label>
              <div className="input-wrapper">
                <span className="input-icon"><Wrench size={16} /></span>
                <input
                  className="input"
                  type="number" step="0.01" placeholder="Ej. 80.00"
                  value={form.costeTaller}
                  onChange={(e) => onChange({ ...form, costeTaller: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Km actuales</label>
              <div className="input-wrapper">
                <span className="input-icon"><Gauge size={16} /></span>
                <input
                  className="input"
                  type="number" placeholder="Ej. 294122"
                  value={form.km}
                  onChange={(e) => onChange({ ...form, km: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button
          className="btn btn-primary flex-1"
          onClick={onSubmit}
          disabled={saving || !form.importe}
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
