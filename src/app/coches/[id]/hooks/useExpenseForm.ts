"use client";

import { useRef, useState } from "react";
import { fetchJsonWithToast, type ToastFn } from "../lib/net";
import { MAINTENANCE_PRESETS } from "@/lib/maintenance/presets";
import type { Car, TimelineEntry, AddExpenseFormState, EditExpenseFormState } from "../lib/types";

// Extraído de CarDetailClient (Ticket: reducir el "god component").
// Estado + handlers del ciclo completo de un gasto: crear, editar inline,
// borrar (con confirm o con undo vía swipe). Depende de `load()` para
// refrescar car/timeline/maintenanceTasks tras cada mutación — eso se
// mantiene en el orquestador porque varios hooks lo comparten.

// Ticket 1.23: helper para mapear label → id semántico. Usado al editar
// gastos antiguos que sólo tienen el label persistido.
function tipoIdFromLabel(label: string): string {
  const m: Record<string, string> = {
    "Carburante": "carburante",
    "Mantenimiento (Taller)": "mantenimiento",
    "Mantenimiento (DIY)": "mantenimiento_diy",
    "Tuning": "tuning",
    "Seguro": "seguro",
    "ITV": "itv",
    "Impuestos": "impuestos",
    "Parking": "parking",
    "Peajes": "peajes",
    "Lavado": "lavado",
    "Otros": "otros",
  };
  return m[label] || "otros";
}

function emptyForm(km: number): AddExpenseFormState {
  return {
    tipo: "Carburante", tipoId: "carburante", importe: "", date: new Date().toISOString().split("T")[0],
    descripcion: "", referencia: "", litros: "", km: String(km || ""),
    costeTaller: "", selectedTask: "", scheduleNext: false, presetKey: "",
    impuesto_circulacion: false,
  };
}

interface UseExpenseFormArgs {
  carId: number;
  car: Car;
  initialCar: Car;
  timeline: TimelineEntry[];
  load: () => void;
  setToast: ToastFn;
  showToast: (msg: string, type?: "success" | "error", ms?: number) => void;
  showUndoToast: (msg: string, restore: () => Promise<void>) => void;
}

export function useExpenseForm({
  carId, car, initialCar, timeline, load, setToast, showToast, showUndoToast,
}: UseExpenseFormArgs) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddExpenseFormState>(() => emptyForm(initialCar.km_actuales));
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditExpenseFormState>({
    id: 0, tipo: "Carburante", importe: 0, date: "", descripcion: "",
  });

  // Ref sincrónica para evitar doble-envío. setSaving() es asíncrono
  // (React agenda el re-render), así que durante la primera ventana de
  // microsegundos del click el botón sigue "habilitado" y un segundo tap
  // rápido crea dos gastos idénticos. El ref bloquea ambos submits con
  // un check sincrónico. Patrón estándar para forms críticos.
  const submittingRef = useRef(false);

  // Reset del ref cada vez que abrimos el modal. Sin esto, un segundo
  // open tras un error previo quedaría bloqueado por submittingRef=true.
  // Open expense form: reset km to current car.km_actuales so the user
  // always sees the latest odometer, not a stale value from a previous
  // session or earlier load. Ticket 1.14 follow-up.
  const openExpenseForm = () => {
    submittingRef.current = false;
    setEditingId(null);   // nuevo gasto, no edición
    setForm(emptyForm(car?.km_actuales ?? initialCar.km_actuales ?? 0));
    setShowForm(true);
  };

  const closeExpenseForm = () => {
    submittingRef.current = false;
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (entry: TimelineEntry) => {
    setEditingId(entry.id);
    setForm({
      tipo: entry.tipo,
      tipoId: (entry as any).tipo_id || tipoIdFromLabel(entry.tipo),
      importe: String(entry.importe),
      date: entry.date,
      descripcion: entry.descripcion || "",
      referencia: entry.referencia || "",
      litros: entry.litros != null ? String(entry.litros) : "",
      km: entry.km != null ? String(entry.km) : String(car?.km_actuales ?? initialCar.km_actuales ?? ""),
      costeTaller: entry.coste_estimado_taller != null ? String(entry.coste_estimado_taller) : "",
      selectedTask: "",
      presetKey: entry.preset_key || "",
      scheduleNext: false,
      impuesto_circulacion: false,
    });
    setShowForm(true);
  };

  const submitForm = async () => {
    if (submittingRef.current) return;  // guard sincrónico
    if (saving) return;                  // guard por si el ref falla
    submittingRef.current = true;
    setSaving(true);
    const body: Record<string, unknown> = {
      carId, tipo: form.tipo, importe: parseFloat(form.importe),
      date: form.date, descripcion: form.descripcion, referencia: form.referencia,
    };
    if (form.litros) body.litros = parseFloat(form.litros);
    if (form.km) body.km = parseInt(form.km);
    if (form.tipoId === "mantenimiento_diy" && form.costeTaller) body.costeTaller = parseFloat(form.costeTaller);
    // Ticket 1.17: si el usuario eligió un preset del catálogo, lo
    // mandamos al backend para que guarde el preset_key y permita la
    // detección automática de tareas pendientes (Ticket 1.16-fix-b).
    if (form.presetKey) body.presetKey = form.presetKey;
    if (form.tipoId) body.tipoId = form.tipoId;
    // Ticket 1.16: si el usuario eligió una tarea abierta en el form de
    // gasto, el backend la cierra con los datos del gasto y crea la
    // siguiente automáticamente (Ticket 1.16 + 1.14 cadena).
    // Ticket 1.16-fix: el checkbox "Programar el siguiente" controla si
    // queremos que completeMaintenanceTask cree la tarea recurrente o
    // sólo cierre la actual sin dejar tarea fantasma.
    // Ticket 1.16-fix-b: si selectedTask === "__new__", primero creamos la
    // tarea nueva con los datos del preset y del form, y después pasamos
    // su id como maintenanceTaskId.
    if (form.selectedTask) {
      if (form.selectedTask === "__new__") {
        const preset = MAINTENANCE_PRESETS.find(
          (p) => p.key === form.presetKey,
        );
        if (preset) {
          const createBody: Record<string, unknown> = {
            carId, part_name: preset.part_name,
            icon_key: preset.icon_key, preset_key: preset.key,
            interval_km: preset.interval_km, interval_months: preset.interval_months,
            current_km: parseInt(form.km) || null,
            current_date: form.date,
            next_km: preset.interval_km ? (parseInt(form.km) || 0) + preset.interval_km : null,
          };
          const tr = await fetchJsonWithToast(
            "/api/maintenance",
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(createBody),
              fallback: "No se pudo crear la tarea de mantenimiento." },
            setToast,
          );
          if (tr.ok) {
            const newTask = tr.data as { id: number };
            body.maintenanceTaskId = newTask.id;
            // NO completamos la tarea recién creada — la dejamos
            // abierta (completed=0) para que el usuario la complete
            // en un futuro gasto. Sólo vinculamos el expense a ella.
            // Sin scheduleNext, createExpense no llamará a
            // completeMaintenanceTask.
            body.scheduleNext = false;
          }
        }
      } else {
        body.maintenanceTaskId = parseInt(form.selectedTask);
        body.scheduleNext = form.scheduleNext;
      }
    }
    // Ticket 1.20: si es Impuestos y el checkbox está marcado, el backend
    // actualiza cars.fecha_impuesto_circulacion con la fecha del gasto.
    if (form.tipoId === "impuestos" && form.impuesto_circulacion) {
      body.impuesto_circulacion = true;
    }

    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/expenses?id=${editingId}` : "/api/expenses";
    const res = await fetchJsonWithToast(
      url,
      { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        fallback: "No se pudo guardar el gasto. Inténtalo de nuevo." },
      setToast,
    );
    setSaving(false);
    submittingRef.current = false;

    if (!res.ok) return;          // el toast ya se disparó dentro del helper
    setShowForm(false);
    setEditingId(null);
    showToast(editingId ? "Gasto actualizado" : "Gasto guardado");
    load();      // refresca car.km_actuales; el form se reinicia al reabrir via openExpenseForm
  };

  // Ticket 1.16: dos variantes de borrado de gasto.
  // - deleteExp: borrado con confirm() (usado por el botón "Eliminar" del
  //   panel expandido). Mantiene el comportamiento de "diálogo de
  //   confirmación" porque es un solo tap deliberado.
  // - deleteExpWithUndo: borrado SIN confirm (usado por swipe). Muestra
  //   inmediatamente un toast con "Deshacer" durante 5s. La entrada se
  //   guarda localmente y se recrea vía POST si el usuario deshace.
  const deleteExpWithUndo = async (id: number) => {
    // Capturamos la entrada ANTES de borrarla para poder restaurarla.
    const entry = timeline.find((t) => t.id === id);
    if (!entry) return;
    const res = await fetchJsonWithToast(
      `/api/expenses?id=${id}`,
      { method: "DELETE", headers: { "Content-Type": "application/json" },
        fallback: "No se pudo eliminar el gasto. Inténtalo de nuevo." },
      setToast,
    );
    if (!res.ok) return;
    // Ticket 1.16: undo real — recreamos vía POST con los datos
    // originales. Excluimos maintenance_task_id y preset_key para no
    // disparar completeMaintenanceTask al restaurar.
    showUndoToast("Gasto eliminado", async () => {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: carId,
          tipo: entry.tipo,
          importe: entry.importe,
          date: entry.date,
          descripcion: entry.descripcion || "",
          referencia: entry.referencia || "",
          litros: entry.litros ?? null,
          km: entry.km ?? null,
          costeTaller: entry.coste_estimado_taller ?? null,
        }),
      });
      load();
    });
    load();
  };

  const deleteExp = async (id: number) => {
    if (!confirm("Eliminar gasto?")) return;
    await deleteExpWithUndo(id);
  };

  return {
    showForm, setShowForm,
    form, setForm,
    saving,
    editingId, editForm, setEditForm,
    openExpenseForm, closeExpenseForm,
    startEdit, submitForm,
    deleteExp, deleteExpWithUndo,
  };
}
