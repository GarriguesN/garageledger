"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";

// Subcomponentes (mismo directorio)
import CarHeader          from "./components/CarHeader";
import CarStatsGrid       from "./components/CarStatsGrid";
import AlertBanner        from "./components/AlertBanner";
import AddExpenseForm     from "./components/AddExpenseForm";
import ExpenseHistory     from "./components/ExpenseHistory";
import MaintenanceSchedule from "./components/MaintenanceSchedule";
import GloveBox           from "./components/GloveBox";

import {
  CATEGORIAS, isFuel,
} from "./lib/format";
import type {
  Car, CarMetrics, TimelineEntry, Note, Attachment, MaintenanceTask,
  AddExpenseFormState, EditExpenseFormState, CarEditFormState,
} from "./lib/types";

export default function CarDetailPage() {
  const params = useParams();
  const carId = parseInt(params.id as string);

  // ── Estado compartido entre paneles ──
  const [car, setCar] = useState<Car | null>(null);
  const [metrics, setMetrics] = useState<CarMetrics | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit car inline
  const [showEditCar, setShowEditCar] = useState(false);
  const [carForm, setCarForm] = useState<CarEditFormState>({
    marca: "", modelo: "", generacion: "", motor: "", ano: "", puertas: "", km_actuales: "",
    estado: "", fecha_ultima_itv: "",
  });

  // Add expense inline
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddExpenseFormState>({
    tipo: "Carburante", importe: "", date: new Date().toISOString().split("T")[0],
    descripcion: "", referencia: "", litros: "", km: "", costeTaller: "", selectedTask: "",
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

  // ── Loader ──
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
        setCarForm({
          marca: d.car.marca, modelo: d.car.modelo, generacion: d.car.generacion, motor: d.car.motor,
          ano: d.car.ano ?? "", puertas: d.car.puertas, km_actuales: d.car.km_actuales,
          estado: d.car.estado, fecha_ultima_itv: d.car.fecha_ultima_itv || "",
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [carId]);

  // Auto-fill km cuando se abre el form de gasto
  useEffect(() => {
    if (showForm && car) {
      setForm((f) => ({ ...f, km: String(car.km_actuales || "") }));
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [showForm, car?.km_actuales]);

  // ── Handlers ──
  const submitForm = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        carId: carId, tipo: form.tipo, importe: parseFloat(form.importe),
        date: form.date, descripcion: form.descripcion, referencia: form.referencia,
      };
      if (form.litros) body.litros = parseFloat(form.litros);
      if (form.km) body.km = parseInt(form.km);
      if (form.tipo.includes("DIY") && form.costeTaller) body.costeTaller = parseFloat(form.costeTaller);
      await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setShowForm(false);
      setForm({
        tipo: "Carburante", importe: "", date: new Date().toISOString().split("T")[0],
        descripcion: "", referencia: "", litros: "", km: "", costeTaller: "", selectedTask: "",
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
    await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ carId, content: noteContent }) });
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
    if (file.size > 5 * 1024 * 1024) {
      setToast({ msg: "Archivo demasiado grande (max 5MB)", type: "error" });
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

  // ── Loading / skeleton ──
  if (loading || !car || !metrics) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-32" />
        <div className="skeleton h-64" />
      </div>
    );
  }

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

      {/* Add expense toggle + form */}
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

      {/* Mantenimiento programado */}
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
