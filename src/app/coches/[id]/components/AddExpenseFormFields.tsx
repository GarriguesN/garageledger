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
  CATEGORIAS, isFuel, isDiy, isTaller,
} from "../lib/format";
import type { AddExpenseFormState, MaintenanceTask } from "../lib/types";
import { MAINTENANCE_PRESETS } from "@/lib/maintenance/presets";
import { useEffect, useState } from "react";

interface AddExpenseFormProps {
  form: AddExpenseFormState;
  maintenanceTasks: MaintenanceTask[];
  saving: boolean;
  onChange: (next: AddExpenseFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  carId: number;
}

export default function AddExpenseForm({
  form, maintenanceTasks, saving, carId,
  onChange, onSubmit, onCancel,
}: AddExpenseFormProps) {
  const fuel = isFuel(form);
  const diy = isDiy(form);

  // ── Ticket 1.16-fix-b — detección automática de tarea por preset_key ──
  const [presetTasks, setPresetTasks] = useState<MaintenanceTask[]>([]);

  useEffect(() => {
    if (!form.presetKey) { setPresetTasks([]); return; }
    fetch(`/api/maintenance?car_id=${carId}&preset_key=${encodeURIComponent(form.presetKey)}`)
      .then(r => r.json())
      .then((arr: MaintenanceTask[]) => setPresetTasks(arr))
      .catch(() => setPresetTasks([]));
  }, [form.presetKey, carId]);

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
        {/* Ticket 1.20: si el tipo es Impuestos, el checkbox controla si
            este pago se considera el IVTM (impuesto de circulación)
            anual y por tanto actualiza cars.fecha_impuesto_circulacion. */}
        {form.tipo === "Impuestos" && (
          <label className="flex items-center gap-2 mt-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={form.impuesto_circulacion}
              onChange={(e) => onChange({ ...form, impuesto_circulacion: e.target.checked })}
              className="w-4 h-4 rounded border-[var(--border-color)] accent-[var(--accent)]"
            />
            <span>Impuesto de circulación (IVTM)</span>
          </label>
        )}
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
      {(isDiy(form) || isTaller(form)) && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">
              Trabajo realizado
            </label>
            <p className="text-[11px] text-[var(--text-muted)] mb-1">
              Elige el trabajo del catálogo. El sistema cierra la tarea pendiente y programa la siguiente automáticamente.
            </p>
            <select
              className="input"
              value={form.presetKey || ""}
              onChange={(e) => {
                const key = e.target.value;
                const preset = MAINTENANCE_PRESETS.find((p) => p.key === key);
                if (!preset) {
                  // "Otro (texto libre)" — limpiamos preset_key pero
                  // mantenemos la descripción manual si la había.
                  onChange({ ...form, presetKey: "", selectedTask: "" });
                  return;
                }
                onChange({
                  ...form,
                  presetKey: preset.key,
                  descripcion: preset.part_name,
                  selectedTask: "",  // limpiamos la selección manual de tarea; la detección automática por preset_key entra en Ticket 1.16-fix-b
                });
              }}
            >
              <option value="">— Otro (texto libre) —</option>
              {Object.entries(
                MAINTENANCE_PRESETS.reduce<Record<string, typeof MAINTENANCE_PRESETS>>((acc, p) => {
                  (acc[p.category] ??= []).push(p);
                  return acc;
                }, {}),
              ).map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.part_name}
                      {p.interval_km ? ` · cada ${p.interval_km} km` : ""}
                      {p.interval_months ? ` · cada ${p.interval_months} meses` : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {/* Ticket 1.16-fix-b: detección automática de tarea por preset_key.
              El endpoint GET /api/maintenance?car_id=X&preset_key=Y nos
              devuelve las tareas abiertas con ese preset. Según el
              resultado mostramos: >1 = selector, =1 = checkbox, 0 =
              checkbox desmarcado para crear tarea nueva. */}
          {form.presetKey && (
            presetTasks.length > 1 ? (
              /* Caso borde: más de una tarea abierta con el mismo preset.
                 Mostramos un selector con las candidatas para que el
                 usuario elija. */
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  Tarea a completar
                </label>
                <select
                  className="input"
                  value={form.selectedTask}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) { onChange({ ...form, selectedTask: "", scheduleNext: false }); return; }
                    const task = presetTasks.find((t) => t.id === parseInt(id));
                    const isRecurring = (task?.interval_km ?? 0) > 0 || (task?.interval_months ?? 0) > 0;
                    onChange({ ...form, selectedTask: id, scheduleNext: isRecurring });
                  }}
                >
                  <option value="">— No completar ninguna —</option>
                  {presetTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.part_name} · próximo: {t.next_km ? `${t.next_km} km` : t.next_date || "—"}
                    </option>
                  ))}
                </select>
                {form.selectedTask && (
                  <label className="flex items-start gap-2 cursor-pointer text-sm mt-2">
                    <input
                      type="checkbox"
                      className="mt-0.5 w-4 h-4 rounded border-[var(--border-color)] accent-[var(--accent)]"
                      checked={form.scheduleNext}
                      onChange={(e) => onChange({ ...form, scheduleNext: e.target.checked })}
                    />
                    <span>
                      Programar el siguiente automáticamente
                      <span className="block text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {(() => { const task = presetTasks.find((t) => t.id === parseInt(form.selectedTask)); if (!task) return null;
                          if ((task.interval_km ?? 0) > 0 && (task.interval_months ?? 0) > 0) return `Cada ${task.interval_km} km o cada ${task.interval_months} meses.`;
                          if ((task.interval_km ?? 0) > 0) return `Cada ${task.interval_km} km.`;
                          if ((task.interval_months ?? 0) > 0) return `Cada ${task.interval_months} meses.`;
                          return "Esta tarea no tiene intervalos (es puntual); desmarcado para no crear tarea fantasma."; })()}
                      </span>
                    </span>
                  </label>
                )}
              </div>
            ) : presetTasks.length === 1 ? (
              /* 1 tarea abierta: checkbox para completarla (marcado por defecto). */
              <label className="flex items-start gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-[var(--border-color)] accent-[var(--accent)]"
                  checked={form.selectedTask === String(presetTasks[0].id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const t = presetTasks[0];
                      const isRecurring = (t.interval_km ?? 0) > 0 || (t.interval_months ?? 0) > 0;
                      onChange({ ...form, selectedTask: String(t.id), scheduleNext: isRecurring });
                    } else {
                      onChange({ ...form, selectedTask: "", scheduleNext: false });
                    }
                  }}
                />
                <span>
                  Completar tarea «{presetTasks[0].part_name}»
                  <span className="block text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Próximo: {presetTasks[0].next_km ? `${presetTasks[0].next_km} km` : ""}
                    {presetTasks[0].next_date ? ` · ${presetTasks[0].next_date}` : ""}
                    {!presetTasks[0].next_km && !presetTasks[0].next_date ? "sin fecha" : ""}
                  </span>
                </span>
              </label>
            ) : (
              /* 0 tareas abiertas: checkbox DESMARCADO para crear una nueva. */
              <label className="flex items-start gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-[var(--border-color)] accent-[var(--accent)]"
                  checked={form.selectedTask === "__new__"}
                  onChange={(e) => {
                    const preset = MAINTENANCE_PRESETS.find((p) => p.key === form.presetKey);
                    if (e.target.checked) {
                      const isRecurring = (preset?.interval_km ?? 0) > 0 || (preset?.interval_months ?? 0) > 0;
                      onChange({ ...form, selectedTask: "__new__", scheduleNext: isRecurring });
                    } else {
                      onChange({ ...form, selectedTask: "", scheduleNext: false });
                    }
                  }}
                />
                <span>
                  Crear tarea programada «{MAINTENANCE_PRESETS.find(p => p.key === form.presetKey)?.part_name || ""}»
                  <span className="block text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {(() => { const p = MAINTENANCE_PRESETS.find(x => x.key === form.presetKey); if (!p) return null;
                      if (p.interval_km > 0 && p.interval_months > 0) return `Cada ${p.interval_km} km o cada ${p.interval_months} meses.`;
                      if (p.interval_km > 0) return `Cada ${p.interval_km} km.`; if (p.interval_months > 0) return `Cada ${p.interval_months} meses.`;
                      return "Sin intervalo predefinido (tarea puntual)."; })()}
                  </span>
                </span>
              </label>
            )
          )}

          {/* Legacy: checkbox para tarea seleccionada manualmente (usado
              cuando el usuario NO eligió un preset). */}
          {form.selectedTask && !form.presetKey && (
            <label className="flex items-start gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 rounded border-[var(--border-color)] accent-[var(--accent)]"
                checked={form.scheduleNext}
                onChange={(e) => onChange({ ...form, scheduleNext: e.target.checked })}
              />
              <span>
                Programar el siguiente mantenimiento automáticamente
                <span className="block text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {(() => {
                    const task = maintenanceTasks.find((t) => t.id === parseInt(form.selectedTask));
                    if (!task) return null;
                    if ((task.interval_km ?? 0) > 0 && (task.interval_months ?? 0) > 0) {
                      return `Cada ${task.interval_km} km o cada ${task.interval_months} meses.`;
                    }
                    if ((task.interval_km ?? 0) > 0) return `Cada ${task.interval_km} km.`;
                    if ((task.interval_months ?? 0) > 0) return `Cada ${task.interval_months} meses.`;
                    return "Esta tarea no tiene intervalos (es puntual); desmarcado para no crear tarea fantasma.";
                  })()}
                </span>
              </span>
            </label>
          )}
          {/* Ticket 1.16: el coste estimado de taller SOLO aplica a DIY, donde
              tiene sentido comparar el gasto real contra el hipotético
              taller. Para "Mantenimiento (Taller)" el importe ya es el
              coste real pagado al mecánico. */}
          {isDiy(form) ? (
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
          ) : (
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
          )}
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
