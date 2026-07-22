"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";

// Subcomponentes del detalle
import CarHeader          from "./CarHeader";
import CarStatsGrid       from "./CarStatsGrid";
import AlertBanner        from "./AlertBanner";
import AddExpenseForm     from "./AddExpenseForm";
import ExpenseHistory     from "./ExpenseHistory";
import MaintenanceSchedule from "./MaintenanceSchedule";
import GloveBox           from "./GloveBox";

import { isFuel } from "../lib/format";
import { MAX_FILE_SIZE_BYTES } from "@/lib/attachments";
import type {
  Car, CarMetrics, TimelineEntry, Note, Attachment, MaintenanceTask,
  AddExpenseFormState, EditExpenseFormState, CarEditFormState,
} from "../lib/types";

interface CarDetailClientProps {
  carId: number;
  initialCar: Car;
  initialMetrics: CarMetrics;
  initialTimeline: TimelineEntry[];
  initialNotes: Note[];
  initialAttachments: Attachment[];
  initialMaintenanceTasks: MaintenanceTask[];
}

export default function CarDetailClient({
  carId,
  initialCar,
  initialMetrics,
  initialTimeline,
  initialNotes,
  initialAttachments,
  initialMaintenanceTasks,
}: CarDetailClientProps) {
  // ── Estado inicial ──
  const [car, setCar] = useState<Car>(initialCar);
  const [metrics, setMetrics] = useState<CarMetrics>(initialMetrics);
  const [timeline, setTimeline] = useState<TimelineEntry[]>(initialTimeline);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>(initialMaintenanceTasks);

  // Edit car inline
  const [showEditCar, setShowEditCar] = useState(false);
  const [carForm, setCarForm] = useState<CarEditFormState>({
    marca: initialCar.marca, modelo: initialCar.modelo,
    generacion: initialCar.generacion || "", motor: initialCar.motor || "",
    ano: initialCar.ano ?? "", puertas: 5, km_actuales: initialCar.km_actuales || 0,
    estado: initialCar.estado || "",
    fecha_ultima_itv: initialCar.fecha_ultima_itv || "",
  });

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
    tipo: "Carburante", importe: 0, date: "", descripcion: "",
  });

  // Timeline pagination
  const [timelineLimit, setTimelineLimit] = useState(10);

  // Notes + uploads
  const [noteContent, setNoteContent] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Toast simple
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // ── Loader (refresco tras mutación; la carga inicial viene del servidor) ──
  const load = () => {
    fetch(`/api/car/${carId}/page-data`)
      .then((r) => r.json())
      .then((d) => {
        setCar(d.car);
        setMetrics(d.metrics);
        setTimeline(d.timeline || []);
        setNotes(d.notes || []);
        setAttachments(d.attachments || []);
        setMaintenanceTasks(d.maintenanceTasks || []);
      })
      .catch(() => { /* network error during refresh; UI keeps prior data */ });
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
    try {
      const body: Record<string, unknown> = {
        carId, tipo: form.tipo, importe: parseFloat(form.importe),
        date: form.date, descripcion: form.descripcion, referencia: form.referencia,
      };
      if (form.litros) body.litros = parseFloat(form.litros);
      if (form.km) body.km = parseInt(form.km);
      if (form.tipo.includes("DIY") && form.costeTaller) body.costeTaller = parseFloat(form.costeTaller);
      await fetch("/api/expenses", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      setShowForm(false);
      setForm({
        tipo: "Carburante", importe: "", date: new Date().toISOString().split("T")[0],
        descripcion: "", referencia: "", litros: "", km: String(car.km_actuales || ""),
        costeTaller: "", selectedTask: "",
      });
      setToast({ msg: "Gasto guardado", type: "success" });
      setTimeout(() => setToast(null), 2500);
      load();
    } finally { setSaving(false); }
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
    await fetch("/api/expenses", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm),
    });
    setEditingId(null);
    setToast({ msg: "Gasto actualizado", type: "success" });
    setTimeout(() => setToast(null), 2500);
    load();
  };

  const deleteExp = async (id: number) => {
    if (!confirm("Eliminar gasto?")) return;
    await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    setToast({ msg: "Gasto eliminado", type: "success" });
    setTimeout(() => setToast(null), 2500);
    load();
  };

  const updateCarData = async () => {
    await fetch("/api/cars", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: carId, ...carForm }),
    });
    setShowEditCar(false);
    load();
  };

  const addNote = async () => {
    if (!noteContent.trim()) return;
    await fetch("/api/notes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carId, content: noteContent }),
    });
    setNoteContent("");
    load();
  };

  const deleteNote = async (id: number) => {
    if (!confirm("Eliminar nota?")) return;
    await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
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
    await fetch("/api/attachments", { method: "POST", body: fd });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    load();
  };

  const deleteAttachment = async (id: number) => {
    if (!confirm("Eliminar archivo?")) return;
    await fetch(`/api/attachments?id=${id}`, { method: "DELETE" });
    load();
  };

  const completeTask = async (task: MaintenanceTask) => {
    const km = prompt(`Km actuales para completar "${task.part_name}":`, String(car?.km_actuales || ""));
    if (!km) return;
    const date = new Date().toISOString().split("T")[0];
    await fetch("/api/maintenance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", id: task.id, currentKm: parseInt(km), currentDate: date }),
    });
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

      {/* Header */}
      <CarHeader
        car={car}
        showEditCar={showEditCar}
        carForm={carForm}
        onChangeCarForm={setCarForm}
        onSave={updateCarData}
        onCancel={() => setShowEditCar(false)}
      />

      {/* Metrics */}
      <CarStatsGrid metrics={metrics} />

      {/* Alerts */}
      <AlertBanner metrics={metrics} />

      {/* Add expense */}
      <div>
        <button className="btn btn-primary mb-3" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Añadir gasto
        </button>
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
      </div>

      {/* Historial */}
      <ExpenseHistory
        timeline={timeline}
        timelineLimit={timelineLimit}
        editingId={editingId}
        editForm={editForm}
        onStartEdit={startEdit}
        onChangeEditForm={setEditForm}
        onSaveInline={updateExpenseInline}
        onCancelEdit={() => setEditingId(null)}
        onDelete={deleteExp}
        onLoadMore={() => setTimelineLimit((n) => n + 20)}
      />

      {/* Mantenimiento */}
      <MaintenanceSchedule
        tasks={maintenanceTasks}
        car={car}
        onCompleteTask={completeTask}
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
    </div>
  );
}
