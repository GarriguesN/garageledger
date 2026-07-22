"use client";

// Historial cronológico de gastos del coche.
// Rediseño Ticket 1.5: cada fila es un mockup "categoría + descripción +
// meta + importe + chevron" con icono circular por categoría usando
// TIPO_COLOR/isFuel/isDiy que ya existían. Mantiene el estado vacío del
// Ticket 1.4 (icono + texto) con el mismo lenguaje visual nuevo, y el
// modo edición inline (EditExpenseFormFields) intacto — Ticket 1.5 no
// toca handlers.

import { useState } from "react";
import {
  Calendar, Plus, Fuel, Wrench, Euro,
  Edit, Save, X, Trash2, FileText, Gauge,
  Receipt, ChevronRight, BarChart3,
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

const TEXT_DARK = "#211a1e";
const TEXT_GRAY = "#8a8588";

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
      {/* Header con título + sparkline + "Ver todos" (mockup).
          "Ver todos" es visualmente clicable pero el handler real queda
          pendiente — no existe la ruta /coches/[id]/historial. Cuando se
          cree, se enchufa aquí. */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-[15px] font-bold flex items-center gap-2 min-w-0">
          <Receipt size={16} style={{ color: "var(--accent)" }} />
          <span className="truncate">Historial de gastos</span>
          <Sparkline data={sparkData} />
        </h2>
        {timeline.length > 0 && (
          <button
            type="button"
            className="text-[12px] font-semibold flex items-center gap-1 flex-shrink-0"
            style={{ color: "var(--accent)" }}
            // Pendiente: ruta /coches/[id]/historial cuando exista.
            disabled
            title="Pendiente: pantalla de historial completo"
          >
            Ver todos <ChevronRight size={12} />
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {timeline.slice(0, timelineLimit).map((entry) => {
          const color = TIPO_COLOR[entry.tipo] || "#6b7280";
          const isEditing = editingId === entry.id;

          return (
            <div key={entry.id} className="card !p-3">
              {isEditing ? (
                <EditFormFields
                  entry={entry}
                  editForm={editForm}
                  onChange={onChangeEditForm}
                  onSave={onSaveInline}
                  onCancel={onCancelEdit}
                />
              ) : (
                <ReadOnlyFields
                  entry={entry}
                  color={color}
                  onStartEdit={onStartEdit}
                  onDelete={onDelete}
                />
              )}
            </div>
          );
        })}

        {timeline.length === 0 && (
          <div className="card flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "#fde7e6", color: "var(--accent)" }}
              aria-hidden
            >
              <Receipt size={22} strokeWidth={1.6} />
            </div>
            <p className="text-sm font-semibold" style={{ color: TEXT_DARK }}>
              Aún no hay gastos registrados
            </p>
            <p className="text-xs" style={{ color: TEXT_GRAY }}>
              Añade el primero arriba con el botón «Añadir gasto».
            </p>
          </div>
        )}

        {timeline.length > timelineLimit && (
          <button
            className="btn btn-secondary w-full text-xs mt-1"
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
  onDelete: (id: number) => void;
}

// Fila del historial (mockup): icono circular por categoría + categoría en
// color + descripción + meta en gris + importe grande a la derecha +
// chevron. Los iconos cambian según TIPO_COLOR/isFuel/isDiy que ya
// existían en lib/format.tsx.
function ReadOnlyFields({ entry, color, onStartEdit, onDelete }: ReadOnlyFieldsProps) {
  const [hover, setHover] = useState(false);
  const Icon = entry.tipo === "Carburante" ? Fuel
    : entry.tipo?.includes("DIY") ? Wrench
    : entry.tipo === "Mantenimiento (Taller)" ? Wrench
    : entry.tipo === "Seguro" ? BarChart3
    : Euro;

  // Línea meta (mockup): fecha + litros/precio/km o "Taller: X€".
  const metaParts: string[] = [];
  if (entry.litros && entry.km && entry.km > 0 && entry.litros > 0) {
    metaParts.push(`${entry.litros}L · ${(entry.importe / entry.litros).toFixed(3)}€/L · ${fmt0(entry.km)} km`);
  } else if (entry.litros) {
    metaParts.push(`${entry.litros}L`);
  } else if (entry.km) {
    metaParts.push(`${fmt0(entry.km)} km`);
  }
  if (entry.coste_estimado_taller) {
    metaParts.push(`Taller: ${fmt(entry.coste_estimado_taller)}€`);
  }
  if (entry.referencia) metaParts.push(`#${entry.referencia}`);

  return (
    <div
      className="flex items-center gap-3 cursor-pointer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Icono circular por categoría */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}1a`, color }}
        aria-hidden
      >
        <Icon size={18} strokeWidth={1.8} />
      </div>

      {/* Texto: categoría (color) + descripción + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[12px] font-semibold uppercase tracking-wide"
            style={{ color }}
          >
            {entry.tipo}
          </span>
          {entry.descripcion && (
            <span
              className="text-[13px] truncate"
              style={{ color: TEXT_DARK }}
              title={entry.descripcion}
            >
              {entry.descripcion}
            </span>
          )}
        </div>
        <p className="text-[11px] mt-0.5 truncate" style={{ color: TEXT_GRAY }}>
          {formatDate(entry.date)}
          {metaParts.length > 0 && ` · ${metaParts.join(" · ")}`}
        </p>
      </div>

      {/* Importe + chevron */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span
          className="text-[15px] font-bold"
          style={{ color: TEXT_DARK }}
        >
          {fmt(entry.importe)}€
        </span>
        <ChevronRight
          size={16}
          style={{ color: hover ? "var(--accent)" : TEXT_GRAY }}
          aria-hidden
        />
      </div>

      {/* Acciones inline (editar/borrar) — aparecen en hover, no rompen
          la fila del mockup porque son iconos pequeños superpuestos. */}
      <div
        className={`flex items-center gap-0.5 transition-opacity ${hover ? "opacity-100" : "opacity-0"}`}
      >
        <button
          type="button"
          className="btn p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)]"
          onClick={(e) => { e.stopPropagation(); onStartEdit(entry); }}
          title="Editar"
          aria-label={`Editar gasto ${entry.descripcion ?? entry.tipo}`}
        >
          <Edit size={13} />
        </button>
        <button
          type="button"
          className="btn p-1.5 text-[var(--text-muted)] hover:text-red-500"
          onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
          title="Eliminar"
          aria-label={`Eliminar gasto ${entry.descripcion ?? entry.tipo}`}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}