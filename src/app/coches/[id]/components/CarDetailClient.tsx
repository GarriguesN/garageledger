"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Subcomponentes del detalle
import CarHeader          from "./CarHeader";
import CarStatsGrid       from "./CarStatsGrid";
import AlertBanner, { AlertTarget } from "./AlertBanner";
import AddExpenseForm     from "./AddExpenseForm";
import ActionButtons       from "./ActionButtons";
import ProgramMaintenanceModal, {
  emptyProgramMaintenanceForm,
  ProgramMaintenanceFormState,
} from "./ProgramMaintenanceModal";
import ExpenseHistory, {
  ReadOnlyFields, EditFormFields,
} from "./ExpenseHistory";
import MaintenanceSchedule, {
  MaintenanceRow, sortMaintenanceTasks,
} from "./MaintenanceSchedule";
import GloveBox           from "./GloveBox";
import FullListModal      from "./FullListModal";

import { isFuel, TIPO_COLOR } from "../lib/format";
// Helper de red: fetch con parseo + toast de error unificado.
// Ticket 1.4 estandariza el patrón: `res.ok` + `{ error }` en JSON + fallback
// genérico cuando el servidor no devuelve nada legible.
import { fetchJsonWithToast } from "../lib/net";
import { MAX_FILE_SIZE_BYTES } from "@/lib/attachments";
import { publishMatricula } from "@/components/TopBarContext";
import type {
  Car, CarMetrics, TimelineEntry, Note, Attachment, MaintenanceTask,
  AddExpenseFormState, EditExpenseFormState,
} from "../lib/types";

interface CarDetailClientProps {
  carId: number;
  initialCar: Car;
  initialMetrics: CarMetrics;
  initialTimeline: TimelineEntry[];
  initialNotes: Note[];
  initialAttachments: Attachment[];
  initialMaintenanceTasks: MaintenanceTask[];
  matricula: string;
}

export default function CarDetailClient({
  carId,
  initialCar,
  initialMetrics,
  initialTimeline,
  initialNotes,
  initialAttachments,
  initialMaintenanceTasks,
  matricula,
}: CarDetailClientProps) {
  // ── Estado inicial ──
  // El CarHeader es ahora solo-lectura: no contiene editor inline. La
  // edición del coche vive en /coches/[id]/editar, accesible desde el
  // menú kebab del header.
  const [car, setCar] = useState<Car>(initialCar);
  const [metrics, setMetrics] = useState<CarMetrics>(initialMetrics);
  const [timeline, setTimeline] = useState<TimelineEntry[]>(initialTimeline);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>(initialMaintenanceTasks);

  // Add expense inline
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddExpenseFormState>({
    tipo: "Carburante", importe: "", date: new Date().toISOString().split("T")[0],
    descripcion: "", referencia: "", litros: "", km: String(initialCar.km_actuales || ""),
    costeTaller: "", selectedTask: "",
  });
  const [saving, setSaving] = useState(false);

  // Edit existing expense inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditExpenseFormState>({
    id: 0, tipo: "Carburante", importe: 0, date: "", descripcion: "",
  });

  // PUNTO 5: modal "Programar mantenimiento"
  const [showProgramMaintenance, setShowProgramMaintenance] = useState(false);
  const [programForm, setProgramForm] = useState<ProgramMaintenanceFormState>(
    emptyProgramMaintenanceForm()
  );
  const [programSaving, setProgramSaving] = useState(false);
  const [programError, setProgramError] = useState<string | null>(null);

  const submitProgramMaintenance = async () => {
    setProgramError(null);
    const part_name = programForm.part_name.trim();
    if (!part_name) {
      setProgramError("Introduce el nombre de la pieza.");
      return;
    }
    const hasKm = programForm.next_km.trim() !== "";
    const hasDate = programForm.next_date.trim() !== "";
    if (!hasKm && !hasDate) {
      setProgramError("Indica al menos un próximo km o una próxima fecha.");
      return;
    }
    setProgramSaving(true);
    try {
      // current_km es opcional. Si el usuario no lo rellena, usamos
      // el km actual del coche para que la fila "Realizado: X km" no
      // quede huérfana. En cualquier caso, lo mandamos al backend para
      // que se registre en maintenance_tasks.current_km.
      const currentKmRaw = programForm.current_km.trim();
      const currentKm = currentKmRaw === ""
        ? (car?.km_actuales ?? null)
        : parseInt(currentKmRaw);
      const body: Record<string, unknown> = {
        carId,
        part_name,
        part_brand: programForm.part_brand.trim() || null,
        current_km: currentKm,
        next_km: hasKm ? parseInt(programForm.next_km) : null,
        next_date: hasDate ? programForm.next_date : null,
        interval_km: programForm.interval_km.trim()
          ? parseInt(programForm.interval_km)
          : null,
        interval_months: programForm.interval_months.trim()
          ? parseInt(programForm.interval_months)
          : null,
        icon_key: programForm.preset_key.trim() || null,
      };
      const res = await fetchJsonWithToast(
        "/api/maintenance",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
          fallback: "No se pudo programar el mantenimiento. Inténtalo de nuevo." },
        setToast,
      );
      if (!res.ok) return;
      setShowProgramMaintenance(false);
      setProgramForm(emptyProgramMaintenanceForm());
      setToast({ msg: `${part_name} programado`, type: "success" });
      setTimeout(() => setToast(null), 2500);
      load();
    } finally {
      setProgramSaving(false);
    }
  };

  // Notes + uploads
  const [noteContent, setNoteContent] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Toast simple
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Ticket 1.6: Map taskId → HTMLElement de la fila correspondiente.
  // MaintenanceSchedule nos llama con `registerTaskRef(task.id, el)` en
  // cada render y con `el=null` al desmontar. Usamos Map (no useRef
  // con objeto) porque queremos set/has/delete ergonómicos.
  const taskRefs = useRef<Map<number, HTMLElement>>(new Map());

  const registerTaskRef = (taskId: number, el: HTMLElement | null) => {
    if (el) taskRefs.current.set(taskId, el);
    else taskRefs.current.delete(taskId);
  };

  // Ticket 1.6: id de tarea a flashear (highlight breve al pulsar alerta).
  const [flashTaskId, setFlashTaskId] = useState<number | null>(null);

  // Click en una alerta: ITV/Seguro abre el editor del coche en la ruta
  // dedicada. Mantenimiento hace scroll a la fila + highlight breve.
  const router = useRouter();
  const handleAlertClick = (target: AlertTarget) => {
    if (target === "edit-itv" || target === "edit-seguro") {
      router.push(`/coches/${carId}/editar`);
      return;
    }
    // scroll-maintenance
    const el = taskRefs.current.get(target.taskId);
    if (!el) {
      // La tarea referenciada por el task_id no está renderizada (caso
      // raro: alert stale de BD, race con completeTask). Avisamos al
      // usuario en vez de hacer scroll a un destino incorrecto.
      setToast({
        msg: "La tarea ya no está en la lista. Recarga la página.",
        type: "error",
      });
      return;
    }
    setFlashTaskId(target.taskId);
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    // Quitamos el flag después de la animación (1.5s en CSS + margen).
    setTimeout(() => {
      setFlashTaskId((current) => (current === target.taskId ? null : current));
    }, 1700);
  };

  // Ticket: el TopBar muestra la matrícula del coche. Publicamos la
  // matrícula antes del primer paint para que el TopBar (que también
  // vive en el mismo árbol cliente) reciba el evento a tiempo.
  useLayoutEffect(() => {
    publishMatricula(matricula || null);
    return () => publishMatricula(null);
  }, [matricula]);

  // PUNTO 7: el navbar contextual del coche ([+] rojo) envía este evento
  // para abrir el formulario de añadir gasto desde el navbar inferior.
  useEffect(() => {
    const handler = () => setShowForm((v) => !v);
    window.addEventListener("garageledger:car-nav-add-expense", handler);
    return () => window.removeEventListener("garageledger:car-nav-add-expense", handler);
  }, []);

  // Modales de "Ver todos" para gastos y mantenimiento. Cada uno abre
  // FullListModal con la lista completa, sin construir páginas nuevas.
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [showAllMaintenance, setShowAllMaintenance] = useState(false);

  // ── Loader (refresco tras mutación; la carga inicial viene del servidor) ──
  //
  // Ticket 1.4: si el refresh silencioso falla, el helper `fetchJsonWithToast`
  // ya dispara el toast de error internamente (con `{ error }` del JSON o el
  // `fallback` si no hay). Por eso `load()` no añade segundo toast: simplemente
  // aborta la actualización de estado y deja que el helper avise al usuario.
  const load = () => {
    fetchJsonWithToast(
      `/api/car/${carId}/page-data`,
      { fallback: "No se pudo refrescar el detalle del vehículo." },
      setToast,
    )
      .then((r) => {
        if (!r.ok) return;
        const d = r.data as {
          car: Car; metrics: CarMetrics; timeline?: TimelineEntry[];
          notes?: Note[]; attachments?: Attachment[]; maintenanceTasks?: MaintenanceTask[];
        };
        setCar(d.car);
        setMetrics(d.metrics);
        setTimeline(d.timeline || []);
        setNotes(d.notes || []);
        setAttachments(d.attachments || []);
        setMaintenanceTasks(d.maintenanceTasks || []);
      });
  };

  // Auto-fill km al abrir el form de gasto (mantiene el comportamiento del SC).
  // Como car ya está inicializado con initialCar (no null), podemos dejar el form
  // con el km actual de entrada; este effect re-sync cuando el usuario hace load().
  useEffect(() => {
    if (showForm && car) {
      setForm((f) => ({ ...f, km: String(car.km_actuales || "") }));
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [showForm, car?.km_actuales]);

  // ── Handlers (idénticos a los del orquestador anterior) ──
  const submitForm = async () => {
    setSaving(true);
    const body: Record<string, unknown> = {
      carId, tipo: form.tipo, importe: parseFloat(form.importe),
      date: form.date, descripcion: form.descripcion, referencia: form.referencia,
    };
    if (form.litros) body.litros = parseFloat(form.litros);
    if (form.km) body.km = parseInt(form.km);
    if (form.tipo.includes("DIY") && form.costeTaller) body.costeTaller = parseFloat(form.costeTaller);

    const res = await fetchJsonWithToast(
      "/api/expenses",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        fallback: "No se pudo guardar el gasto. Inténtalo de nuevo." },
      setToast,
    );
    setSaving(false);

    if (!res.ok) return;          // el toast ya se disparó dentro del helper
    setShowForm(false);
    setForm({
      tipo: "Carburante", importe: "", date: new Date().toISOString().split("T")[0],
      descripcion: "", referencia: "", litros: "", km: String(car.km_actuales || ""),
      costeTaller: "", selectedTask: "",
    });
    setToast({ msg: "Gasto guardado", type: "success" });
    setTimeout(() => setToast(null), 2500);
    load();      // si falla, fetchJsonWithToast ya muestra el toast de error
  };

  const startEdit = (entry: TimelineEntry) => {
    setEditingId(entry.id);
    setEditForm({
      id: entry.id, tipo: entry.tipo, importe: entry.importe, date: entry.date,
      descripcion: entry.descripcion || "", litros: entry.litros ?? null, km: entry.km ?? null,
      coste_estimado_taller: entry.coste_estimado_taller ?? null,
    });
  };

  const updateExpenseInline = async () => {
    if (!editingId) return;
    const res = await fetchJsonWithToast(
      "/api/expenses",
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm),
        fallback: "No se pudo actualizar el gasto. Inténtalo de nuevo." },
      setToast,
    );
    if (!res.ok) return;
    setEditingId(null);
    setToast({ msg: "Gasto actualizado", type: "success" });
    setTimeout(() => setToast(null), 2500);
    load();
  };

  const deleteExp = async (id: number) => {
    if (!confirm("Eliminar gasto?")) return;
    const res = await fetchJsonWithToast(
      `/api/expenses?id=${id}`,
      { method: "DELETE",
        fallback: "No se pudo eliminar el gasto. Inténtalo de nuevo." },
      setToast,
    );
    if (!res.ok) return;
    setToast({ msg: "Gasto eliminado", type: "success" });
    setTimeout(() => setToast(null), 2500);
    load();
  };

  const addNote = async () => {
    if (!noteContent.trim()) return;
    const res = await fetchJsonWithToast(
      "/api/notes",
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId, content: noteContent }),
        fallback: "No se pudo guardar la nota. Inténtalo de nuevo." },
      setToast,
    );
    if (!res.ok) return;
    setNoteContent("");
    load();
  };

  const deleteNote = async (id: number) => {
    if (!confirm("Eliminar nota?")) return;
    const res = await fetchJsonWithToast(
      `/api/notes?id=${id}`,
      { method: "DELETE",
        fallback: "No se pudo eliminar la nota. Inténtalo de nuevo." },
      setToast,
    );
    if (!res.ok) return;
    load();
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      // Doble check cliente/servidor: cliente evita round-trip; servidor es la verdad.
      setToast({ msg: `Archivo demasiado grande (máx ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB)`, type: "error" });
      setTimeout(() => setToast(null), 3000);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("car_id", String(carId));
    fd.append("file", file);
    const res = await fetchJsonWithToast(
      "/api/attachments",
      { method: "POST", body: fd,
        fallback: "No se pudo subir el archivo. Inténtalo de nuevo." },
      setToast,
    );
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!res.ok) return;
    load();
  };

  const deleteAttachment = async (id: number) => {
    if (!confirm("Eliminar archivo?")) return;
    const res = await fetchJsonWithToast(
      `/api/attachments?id=${id}`,
      { method: "DELETE",
        fallback: "No se pudo eliminar el archivo. Inténtalo de nuevo." },
      setToast,
    );
    if (!res.ok) return;
    load();
  };

  const completeTask = async (task: MaintenanceTask) => {
    const km = prompt(`Km actuales para completar "${task.part_name}":`, String(car?.km_actuales || ""));
    if (!km) return;
    const date = new Date().toISOString().split("T")[0];
    const res = await fetchJsonWithToast(
      "/api/maintenance",
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", id: task.id, currentKm: parseInt(km), currentDate: date }),
        fallback: `No se pudo completar "${task.part_name}". Inténtalo de nuevo.` },
      setToast,
    );
    if (!res.ok) return;
    setToast({ msg: `${task.part_name} completado`, type: "success" });
    setTimeout(() => setToast(null), 2500);
    load();
  };

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all ${
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header — solo lectura. Editar vive en /coches/[id]/editar. */}
      <CarHeader car={car} />

      {/* Metrics */}
      <CarStatsGrid metrics={metrics} />

      {/* Alerts (informativas: no son botones, no llevan a ningún sitio) */}
      <AlertBanner metrics={metrics} />

      {/* Add expense */}
      <ActionButtons
        onAddExpense={() => setShowForm(!showForm)}
        onProgramMaintenance={() => {
          setProgramError(null);
          setShowProgramMaintenance((v) => !v);
        }}
      />
      {showForm && (
        <AddExpenseForm
          form={form}
          maintenanceTasks={maintenanceTasks}
          saving={saving}
          onChange={setForm}
          onSubmit={submitForm}
          onCancel={() => setShowForm(false)}
        />
      )}
      {showProgramMaintenance && (
        <ProgramMaintenanceModal
          form={programForm}
          saving={programSaving}
          error={programError}
          onChange={setProgramForm}
          onSubmit={submitProgramMaintenance}
          onCancel={() => {
            setShowProgramMaintenance(false);
            setProgramForm(emptyProgramMaintenanceForm());
            setProgramError(null);
          }}
        />
      )}

      {/* Historial */}
      <ExpenseHistory
        timeline={timeline}
        editingId={editingId}
        editForm={editForm}
        onStartEdit={startEdit}
        onChangeEditForm={setEditForm}
        onSaveInline={updateExpenseInline}
        onCancelEdit={() => setEditingId(null)}
        onDelete={deleteExp}
        onOpenAll={() => setShowAllExpenses(true)}
      />

      {/* Mantenimiento */}
      <MaintenanceSchedule
        tasks={maintenanceTasks}
        car={car}
        onCompleteTask={completeTask}
        registerTaskRef={registerTaskRef}
        flashTaskId={flashTaskId}
        onOpenAll={() => setShowAllMaintenance(true)}
      />

      {/* Guantera (notes + attachments) */}
      <GloveBox
        notes={notes}
        attachments={attachments}
        noteContent={noteContent}
        uploading={uploading}
        fileInputRef={fileRef}
        onNoteContentChange={setNoteContent}
        onAddNote={addNote}
        onDeleteNote={deleteNote}
        onUploadFile={uploadFile}
        onPickFile={() => fileRef.current?.click()}
        onDeleteAttachment={deleteAttachment}
      />

      {/* Modal "Ver todos" — gastos */}
      <FullListModal
        open={showAllExpenses}
        title="Historial completo de gastos"
        totalCount={timeline.length}
        onClose={() => setShowAllExpenses(false)}
      >
        <div className="space-y-1.5">
          {timeline.map((entry) => {
            const color = (TIPO_COLOR as Record<string, string>)[entry.tipo] || "#6b7280";
            const isEditing = editingId === entry.id;
            return (
              <div key={entry.id} className="card !p-3">
                {isEditing ? (
                  <EditFormFields
                    entry={entry}
                    editForm={editForm}
                    onChange={setEditForm}
                    onSave={updateExpenseInline}
                    onCancel={() => setEditingId(null)}
                    onDelete={deleteExp}
                  />
                ) : (
                  <ReadOnlyFields
                    entry={entry}
                    color={color}
                    onStartEdit={startEdit}
                  />
                )}
              </div>
            );
          })}
        </div>
      </FullListModal>

      {/* Modal "Ver todos" — mantenimiento */}
      <FullListModal
        open={showAllMaintenance}
        title="Mantenimientos programados"
        totalCount={maintenanceTasks.length}
        onClose={() => setShowAllMaintenance(false)}
      >
        <div className="space-y-1.5">
          {sortMaintenanceTasks(maintenanceTasks, car).map((task) => (
            <MaintenanceRow
              key={task.id}
              task={task}
              car={car}
              onComplete={completeTask}
            />
          ))}
        </div>
      </FullListModal>
    </div>
  );
}
