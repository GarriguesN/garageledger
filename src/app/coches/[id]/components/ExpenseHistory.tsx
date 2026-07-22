"use client";

import {
  Calendar, Plus, Fuel, Wrench, Euro,
  Edit, Save, X, Trash2, FileText, Gauge,
} from "lucide-react";
import {
  fmt, fmt0, formatDate, Sparkline, TIPO_COLOR, CATEGORIAS,
} from "../lib/format";
import type {
  TimelineEntry, EditExpenseFormState,
} from "../lib/types";

interface ExpenseHistoryProps {
  timeline: TimelineEntry[];
  timelineLimit: number;
  editingId: number | null;
  editForm: EditExpenseFormState;
  onStartEdit: (entry: TimelineEntry) => void;
  onChangeEditForm: (next: EditExpenseFormState) => void;
  onSaveInline: () => void;
  onCancelEdit: () => void;
  onDelete: (id: number) => void;
  onLoadMore: () => void;
}

export default function ExpenseHistory({
  timeline, timelineLimit,
  editingId, editForm,
  onStartEdit, onChangeEditForm, onSaveInline, onCancelEdit,
  onDelete, onLoadMore,
}: ExpenseHistoryProps) {
  // Sparkline datos: carburante chronológico ascendente.
  const sparkData = timeline
    .filter((e) => e.tipo === "Carburante")
    .reverse()
    .map((e) => e.importe);

  return (
    <div>
      <h2 className="text-base font-bold mb-3 flex items-center gap-2">
        <Calendar size={16} style={{ color: "var(--accent)" }} /> Historial
        <Sparkline data={sparkData} />
      </h2>
      <div className="space-y-2">
        {timeline.slice(0, timelineLimit).map((entry) => {
          const color = TIPO_COLOR[entry.tipo] || "#6b7280";
          const isEditing = editingId === entry.id;

          return (
            <div key={entry.id} className="card flex items-start gap-3 py-2 px-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                style={{ background: `${color}18` }}
              >
                {entry.tipo === "Carburante" ? (
                  <Fuel size={14} style={{ color }} />
                ) : entry.tipo?.includes("DIY") ? (
                  <Wrench size={14} style={{ color }} />
                ) : (
                  <Euro size={14} style={{ color }} />
                )}
              </div>

              {isEditing ? (
                <EditFormFields
                  entry={entry}
                  editForm={editForm}
                  onChange={onChangeEditForm}
                  onSave={onSaveInline}
                  onCancel={onCancelEdit}
                />
              ) : (
                <ReadOnlyFields entry={entry} color={color} onStartEdit={onStartEdit} />
              )}

              {!isEditing && (
                <button
                  className="btn p-2 text-[var(--text-muted)] hover:text-red-500 flex-shrink-0"
                  onClick={() => onDelete(entry.id)}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
        {timeline.length === 0 && (
          <div className="card text-center py-6">
            <p className="text-sm text-[var(--text-secondary)]">No hay gastos registrados</p>
          </div>
        )}
        {timeline.length > timelineLimit && (
          <button
            className="btn btn-secondary w-full text-xs mt-2"
            onClick={onLoadMore}
          >
            Cargar más ({timeline.length - timelineLimit} restantes)
          </button>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────

interface EditFormFieldsProps {
  entry: TimelineEntry;
  editForm: EditExpenseFormState;
  onChange: (next: EditExpenseFormState) => void;
  onSave: () => void;
  onCancel: () => void;
}

function EditFormFields({ entry, editForm, onChange, onSave, onCancel }: EditFormFieldsProps) {
  const color = TIPO_COLOR[entry.tipo] || "#6b7280";
  return (
    <div className="flex-1 space-y-3">
      <div className="flex items-center gap-2">
        <span className="badge text-xs" style={{ background: `${color}18`, color }}>
          {entry.tipo}
        </span>
        <span className="text-xs font-semibold text-[var(--text-secondary)]">
          Editando gasto
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Tipo</label>
          <select
            className="input text-xs"
            value={editForm.tipo}
            onChange={(e) =>
              onChange({
                ...editForm,
                tipo: e.target.value,
                litros: null, km: null, coste_estimado_taller: null,
              })
            }
          >
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Importe (€)</label>
          <div className="input-wrapper">
            <span className="input-icon"><Euro size={14} /></span>
            <input
              className="input text-xs" type="number" step="0.01"
              value={editForm.importe}
              onChange={(e) => onChange({ ...editForm, importe: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">Fecha</label>
        <div className="input-wrapper">
          <span className="input-icon"><Calendar size={14} /></span>
          <input
            className="input text-xs"
            type="date"
            value={editForm.date}
            onChange={(e) => onChange({ ...editForm, date: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">Descripción</label>
        <div className="input-wrapper">
          <span className="input-icon"><FileText size={14} /></span>
          <input
            className="input text-xs"
            placeholder="Descripción"
            value={editForm.descripcion}
            onChange={(e) => onChange({ ...editForm, descripcion: e.target.value })}
          />
        </div>
      </div>
      {editForm.tipo === "Carburante" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Litros</label>
            <div className="input-wrapper">
              <span className="input-icon"><Fuel size={14} /></span>
              <input
                className="input text-xs" type="number" step="0.1" placeholder="Litros"
                value={editForm.litros ?? ""}
                onChange={(e) =>
                  onChange({
                    ...editForm,
                    litros: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Km</label>
            <div className="input-wrapper">
              <span className="input-icon"><Gauge size={14} /></span>
              <input
                className="input text-xs" type="number" placeholder="Km"
                value={editForm.km ?? ""}
                onChange={(e) =>
                  onChange({
                    ...editForm,
                    km: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>
        </div>
      )}
      {editForm.tipo?.includes("DIY") && (
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">
            Coste taller (€)
          </label>
          <div className="input-wrapper">
            <span className="input-icon"><Wrench size={14} /></span>
            <input
              className="input text-xs" type="number" step="0.01" placeholder="Coste taller (€)"
              value={editForm.coste_estimado_taller ?? ""}
              onChange={(e) =>
                onChange({
                  ...editForm,
                  coste_estimado_taller: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
            />
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button className="btn btn-primary btn-sm text-xs" onClick={onSave}>
          <Save size={12} /> Guardar
        </button>
        <button className="btn btn-secondary btn-sm text-xs" onClick={onCancel}>
          <X size={12} /> Cancelar
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────

interface ReadOnlyFieldsProps {
  entry: TimelineEntry;
  color: string;
  onStartEdit: (entry: TimelineEntry) => void;
}

function ReadOnlyFields({ entry, color, onStartEdit }: ReadOnlyFieldsProps) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="badge text-xs" style={{ background: `${color}18`, color }}>
          {entry.tipo}
        </span>
        <span className="text-sm font-bold">{fmt(entry.importe)}€</span>
        <button
          className="btn p-1 ml-auto text-[var(--text-muted)] hover:text-[var(--accent)]"
          onClick={() => onStartEdit(entry)}
          title="Editar"
        >
          <Edit size={12} />
        </button>
      </div>
      {entry.descripcion && (
        <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
          {entry.descripcion}
        </p>
      )}
      <p className="text-xs text-[var(--text-muted)] mt-0.5">
        {formatDate(entry.date)}
        {entry.litros && entry.km && entry.km > 0 && entry.litros > 0
          ? ` · ${entry.litros}L · ${(entry.importe / entry.litros).toFixed(3)}€/L`
          : entry.litros
          ? ` · ${entry.litros}L`
          : ""}
        {entry.km && ` · ${fmt0(entry.km)} km`}
        {entry.referencia && ` · #${entry.referencia}`}
        {entry.coste_estimado_taller && ` · Taller: ${fmt(entry.coste_estimado_taller)}€`}
      </p>
    </div>
  );
}
