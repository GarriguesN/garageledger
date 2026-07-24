// @ts-nocheck
"use client";

// Historial cronológico de gastos del coche.
// Rediseño Ticket 1.5 + 1.5-fix: cada fila es un mockup "categoría +
// descripción + meta + importe + chevron" con icono circular por categoría
// usando TIPO_COLOR/isFuel/isDiy que ya existían. Estado vacío del Ticket
// 1.4 conservado. Modo edición inline intacto.
//
// Accesibilidad móvil (Ticket 1.5-fix):
//   - Sin :hover (touch), la fila NO debe perder acceso a editar/borrar.
//   - Estrategia: tap en la fila → abre edición (onStartEdit). Borrar se
//     mueve a un kebab `MoreVertical` siempre visible (no depende de
//     hover). En escritorio con hover, los iconos de editar/borrar siguen
//     apareciendo también al pasar el ratón para velocidad de uso.
//   - Razón: respeta la affordance del mockup (fila clickeable) y no
//     depende de un sensor (hover) que no existe en táctil.

"use client";

import {
  Calendar, Fuel, Wrench, Euro,
  Edit, Save, X, Trash2, FileText, Gauge,
  Receipt, ChevronRight, ChevronDown, BarChart3,
} from "lucide-react";
import {
  fmt, fmt0, formatDate, TIPO_COLOR, CATEGORIAS,
  isFuel, isDiy, isTaller, isMaintenance, isAnnual,
} from "../lib/format";
import type {
  TimelineEntry, EditExpenseFormState,
} from "../lib/types";
import { useState } from "react";

interface ExpenseHistoryProps {
  timeline: TimelineEntry[];
  editingId?: number | null;
  editForm?: EditExpenseFormState;
  onStartEdit: (entry: TimelineEntry) => void;
  onChangeEditForm?: (next: EditExpenseFormState) => void;
  onSaveInline?: () => void;
  onCancelEdit?: () => void;
  onDelete: (id: number) => void;
  /** Abre el modal con la lista completa de gastos. */
  onOpenAll: () => void;
}

const TEXT_DARK = "#211a1e";
const TEXT_GRAY = "#8a8588";

const VISIBLE_LIMIT = 5;

export default function ExpenseHistory({
  timeline,
  editingId = null, editForm,
  onStartEdit, onChangeEditForm, onSaveInline, onCancelEdit,
  onDelete, onOpenAll,
}: ExpenseHistoryProps) {
  // Ticket 1.15: acordeón — sólo una fila expandida a la vez.
  // La fila entera en estado normal ya NO abre edición al tap.
  // Sólo el chevron expande/colapsa. La edición vive dentro del panel
  // expandido, junto al botón borrar.
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const toggleExpanded = (id: number) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div>
      {/* Header con título + "Ver todos" (mockup).
          "Ver todos" abre un modal con la lista completa. */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-[15px] font-bold flex items-center gap-2 min-w-0">
          <Receipt size={16} style={{ color: "var(--accent)" }} />
          <span className="truncate">Historial de gastos</span>
        </h2>
        {timeline.length > 5 && (
          <button
            type="button"
            className="text-[12px] font-semibold flex items-center gap-1 flex-shrink-0"
            style={{ color: "var(--accent)" }}
            onClick={() => onOpenAll()}
          >
            Ver todos <ChevronRight size={12} />
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {timeline.slice(0, VISIBLE_LIMIT).map((entry) => {
          const color = TIPO_COLOR[entry.tipo] || "#6b7280";
          const isEditing = editingId === entry.id;
          const isExpanded = expandedId === entry.id;

          return (
            <div key={entry.id} className="card !p-0 overflow-hidden">
              {isEditing ? (
                <EditFormFields
                  entry={entry}
                  editForm={editForm}
                  onChange={onChangeEditForm}
                  onSave={onSaveInline}
                  onCancel={onCancelEdit}
                  onDelete={onDelete}
                />
              ) : (
                <ReadOnlyFields
                  entry={entry}
                  color={color}
                  isExpanded={isExpanded}
                  onToggle={() => toggleExpanded(entry.id)}
                  onStartEdit={() => {
                    setExpandedId(entry.id);
                    onStartEdit(entry);
                  }}
                  onDelete={() => onDelete(entry.id)}
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
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────

interface EditFormFieldsProps {
  entry: TimelineEntry;
  editForm?: EditExpenseFormState;
  onChange: (next: EditExpenseFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: number) => void;
}

export function EditFormFields({ entry, editForm, onChange, onSave, onCancel, onDelete }: EditFormFieldsProps) {
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
      <div className="flex gap-2 items-center flex-wrap">
        <button className="btn btn-primary btn-sm text-xs" onClick={onSave}>
          <Save size={12} /> Guardar
        </button>
        <button className="btn btn-secondary btn-sm text-xs" onClick={onCancel}>
          <X size={12} /> Cancelar
        </button>
        <button
          className="btn btn-sm text-xs ml-auto"
          style={{ color: "#c3423f" }}
          onClick={() => {
            if (confirm("Eliminar gasto?")) onDelete(entry.id);
          }}
          aria-label={`Borrar gasto ${entry.descripcion ?? entry.tipo}`}
        >
          <Trash2 size={12} /> Borrar
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────

interface ReadOnlyFieldsProps {
  entry: TimelineEntry;
  color: string;
  isExpanded: boolean;
  onToggle: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
}

// Fila del historial (mockup). Ticket 1.15: el tap ya NO abre edición;
// sólo el chevron expande/colapsa un panel con detalles + acciones.
export function ReadOnlyFields({
  entry, color, isExpanded, onToggle, onStartEdit, onDelete,
}: ReadOnlyFieldsProps) {

  // Ticket 1.23: usamos tipo_id semántico (estable) si está; fallback al
  // label (legible) si no. Toda la lógica pasa por los helpers de format.tsx.
  const entryForm = { tipo: entry.tipo, tipoId: (entry as any).tipo_id ?? null };
  // Aliases para evitar shadow del import dentro del JSX.
  const _fuel = isFuel(entryForm);
  const _diy = isDiy(entryForm);
  const _taller = isTaller(entryForm);
  const _annual = isAnnual(entryForm);

  const Icon = _fuel ? Fuel
    : _diy ? Wrench
    : _taller ? Wrench
    : _annual ? BarChart3
    : Euro;

  const panelId = `expense-panel-${entry.id}`;

  return (
    <div>
      {/* Cabecera de la fila (siempre visible). El chevron lleva
          aria-expanded/aria-controls. */}
      <div className="relative flex items-center gap-3 px-3 py-3">
        {/* Icono circular por categoría */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}1a`, color }}
          aria-hidden
        >
          <Icon size={18} strokeWidth={1.8} />
        </div>

        {/* Texto: categoría (color) + meta. La descripción vive en el panel
            expandido — la fila cerrada es lo más minimalista posible
            (Ticket 1.17: precio SIEMPRE a la derecha). */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[12px] font-semibold uppercase tracking-wide"
              style={{ color }}
            >
              {entry.tipo}
            </span>
          </div>
          <p className="text-[11px] mt-0.5 truncate" style={{ color: TEXT_GRAY }}>
            {formatDate(entry.date)}
            {_fuel && entry.litros ? ` · ${entry.litros} L` : ""}
          </p>
        </div>

        {/* Ticket 1.17: la columna derecha de la fila cerrada SIEMPRE es
            el precio. Para carburante era litros (los litros ya están
            en la línea meta), lo unificamos al precio para todas las
            categorías. */}
        <span className="font-semibold flex-shrink-0" style={{ color: "var(--accent)" }}>
          {fmt(entry.importe)}€
        </span>

        {/* Chevron con aria-expanded/aria-controls (Ticket 1.15). */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={panelId}
          aria-label={isExpanded ? "Contraer detalles" : "Expandir detalles"}
          className="flex-shrink-0 p-1 -mr-1 rounded transition-transform"
          style={{
            color: TEXT_GRAY,
            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
          }}
        >
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>

      {/* Panel expandido (acordeón). max-height animado + aria-hidden.
          role=region para que lector de pantalla lo identifique como zona
          expandible. */}
      <div
        id={panelId}
        role="region"
        aria-label={`Detalles de ${entry.tipo} ${entry.descripcion ?? ""}`.trim()}
        className="overflow-hidden border-t"
        style={{
          borderColor: "var(--border-color)",
          maxHeight: isExpanded ? "500px" : "0px",
          transition: "max-height 200ms ease",
          opacity: isExpanded ? 1 : 0,
          transitionProperty: "max-height, opacity",
        }}
      >
        <div className="px-3 py-3 space-y-1.5 text-[12px]" style={{ color: TEXT_DARK }}>
          {/* Banner informativo para ITV/Seguro/Impuestos: explica al
              usuario que esta fecha actualiza automáticamente la del coche. */}
          {_annual && (
            <p
              className="rounded-md px-2 py-1 text-[11px]"
              style={{ background: "#e7eef7", color: "#1d4ed8" }}
            >
              ℹ️ Esta fecha actualiza automáticamente{" "}
              <strong>
                {isItv && "fecha_ultima_itv"}
                {isSeguro && "fecha_vencimiento_seguro"}
                {isImpuestos && "fecha_impuesto_circulacion"}
              </strong>{" "}
              del coche.
            </p>
          )}
          {/* Descripción completa (no truncada). */}
          {entry.descripcion && (
            <p className="break-words"><strong>Descripción:</strong> {entry.descripcion}</p>
          )}
          {/* Detalles carburante (en fila cerrada solo mostramos fecha+litros;
              aquí añadimos €/L, km, referencia). */}
          {_fuel && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {entry.litros != null && <p><strong>Litros:</strong> {entry.litros} L</p>}
              {entry.km != null && entry.km > 0 && <p><strong>Km:</strong> {fmt0(entry.km)}</p>}
              {entry.litros && entry.litros > 0 && (
                <p><strong>Precio:</strong> {(entry.importe / entry.litros).toFixed(3)} €/L</p>
              )}
              {entry.referencia && <p><strong>Referencia:</strong> {entry.referencia}</p>}
            </div>
          )}
          {/* DIY: mostramos coste_estimado_taller sólo si es DIY (Ticket 1.16).
              Para "Mantenimiento (Taller)" no aplica, ya tienes el importe real. */}
          {_diy && entry.coste_estimado_taller != null && entry.coste_estimado_taller > 0 && (
            <p>
              <strong>Coste estimado taller:</strong>{" "}
              {fmt(entry.coste_estimado_taller)} €
              <span className="block text-[11px] mt-0.5" style={{ color: TEXT_GRAY }}>
                Tu ahorro: {fmt(entry.coste_estimado_taller - entry.importe)} €
              </span>
            </p>
          )}
          {/* Taller: nada extra. El importe ya está visible en la cabecera
              del panel y no hay referencia cruzada (no es DIY). */}
          {_taller && entry.referencia && (
            <p><strong>Referencia:</strong> {entry.referencia}</p>
          )}
          {/* Notas — la entrada de BD no tiene campo notes todavía; si lo
              añadimos en el futuro, se mostrará aquí. */}
          {/* Acciones: Editar + Borrar */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
              aria-label={`Editar gasto ${entry.descripcion ?? entry.tipo}`}
              className="flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded"
              style={{ color: "var(--accent)" }}
            >
              <Edit size={14} />
              Editar
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded"
              style={{ color: "#dc2626" }}
              aria-label={`Borrar gasto ${entry.descripcion ?? entry.tipo}`}
            >
              <Trash2 size={14} />
              Borrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}