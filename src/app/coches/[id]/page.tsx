"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Car, ArrowLeft, Trash2, Gauge, Euro, Fuel, Wrench,
  TrendingDown, Circle, Plus, Calendar, Download, Edit,
  X, Save, FileText, Paperclip, Upload, CheckCircle2, Clock, Hash, AlertTriangle,
} from "lucide-react";

const CATEGORIAS = [
  "Carburante", "Mantenimiento (DIY)", "Mantenimiento (Taller)",
  "Tuning",
  "Seguro", "ITV", "Impuestos", "Parking", "Peajes", "Lavado", "Otros"
];

const TIPO_COLOR: Record<string, string> = {
  "Carburante": "#c3423f", "Mantenimiento (DIY)": "#4f9d69",
  "Mantenimiento (Taller)": "#d4956a", "Tuning": "#8b5cf6",
  "Seguro": "#3b82f6",
  "ITV": "#8b5cf6", "Impuestos": "#f59e0b", "Parking": "#6b7280",
  "Peajes": "#10b981", "Lavado": "#ec4899", "Otros": "#6b7280",
};

function fmt(n: number) { return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmt0(n: number) { return n.toLocaleString("es-ES", { minimumFractionDigits: 0 }); }
function formatDate(d: string) { return new Date(d + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" }); }

// ── tiny sparkline ──
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 60, h = 20;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="inline-block align-middle">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
    </svg>
  );
}

export default function CarDetailPage() {
  const params = useParams();
  const router = useRouter();
  const carId = parseInt(params.id as string);

  const [car, setCar] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit car state
  const [showEditCar, setShowEditCar] = useState(false);
  const [carForm, setCarForm] = useState<any>({});

  // Add expense form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    tipo: "Carburante", importe: "", date: new Date().toISOString().split("T")[0],
    descripcion: "", referencia: "", litros: "", km: "", costeTaller: "", selectedTask: ""
  });
  const [saving, setSaving] = useState(false);

  // Auto-fill km when form opens
  useEffect(() => {
    if (showForm && car) {
      setForm(f => ({ ...f, km: String(car.km_actuales || "") }));
    }
  }, [showForm, car?.km_actuales]);

  // Edit expense state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [timelineLimit, setTimelineLimit] = useState(10);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Note state
  const [noteContent, setNoteContent] = useState("");

  // Upload state
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    fetch(`/api/car/${carId}/page-data`)
      .then(r => r.json())
      .then(d => {
        setCar(d.car); setMetrics(d.metrics); setTimeline(d.timeline || []);
        setNotes(d.notes || []); setAttachments(d.attachments || []); setMaintenanceTasks(d.maintenanceTasks || []);
        setCarForm({
          marca: d.car.marca, modelo: d.car.modelo, generacion: d.car.generacion, motor: d.car.motor,
          ano: d.car.ano ?? "", puertas: d.car.puertas, km_actuales: d.car.km_actuales,
          estado: d.car.estado, fecha_ultima_itv: d.car.fecha_ultima_itv || "",
        });
      }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [carId]);

  // ── Submit new expense ──
  const submitForm = async () => {
    setSaving(true);
    try {
      const body: any = { carId: carId, tipo: form.tipo, importe: parseFloat(form.importe), date: form.date, descripcion: form.descripcion, referencia: form.referencia };
      if (form.litros) body.litros = parseFloat(form.litros);
      if (form.km) body.km = parseInt(form.km);
      if (form.tipo.includes("DIY") && form.costeTaller) body.costeTaller = parseFloat(form.costeTaller);
      await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setShowForm(false);
      setForm({ tipo: "Carburante", importe: "", date: new Date().toISOString().split("T")[0], descripcion: "", referencia: "", litros: "", km: "", costeTaller: "", selectedTask: "" });
      setToast({ msg: "Gasto guardado", type: "success" });
      setTimeout(() => setToast(null), 2500);
      load();
    } finally { setSaving(false); }
  };

  // ── Update expense ──
  const updateExpenseInline = async () => {
    if (!editingId) return;
    await fetch("/api/expenses", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditingId(null);
    setToast({ msg: "Gasto actualizado", type: "success" });
    setTimeout(() => setToast(null), 2500);
    load();
  };

  const startEdit = (exp: any) => {
    setEditingId(exp.id);
    setEditForm({ id: exp.id, tipo: exp.tipo, importe: exp.importe, date: exp.date, descripcion: exp.descripcion || "", litros: exp.litros ?? "", km: exp.km ?? "", coste_estimado_taller: exp.coste_estimado_taller ?? "" });
  };

  // ── Update car ──
  const updateCarData = async () => {
    await fetch("/api/cars", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: carId, ...carForm }),
    });
    setShowEditCar(false);
    load();
  };

  // ── Note ──
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

  // ── Upload ──
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

  // ── Complete maintenance ──
  const completeTask = async (task: any) => {
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

  // ── Delete expense ──
  const deleteExp = async (id: number) => {
    if (!confirm("Eliminar gasto?")) return;
    await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    setToast({ msg: "Gasto eliminado", type: "success" });
    setTimeout(() => setToast(null), 2500);
    load();
  };

  if (loading || !car) {
    return <div className="space-y-3"><div className="skeleton h-32" /><div className="skeleton h-64" /></div>;
  }

  const isDiy = form.tipo === "Mantenimiento (DIY)" || form.tipo === "Mantenimiento (Taller)";
  const isFuel = form.tipo === "Carburante";
  const isMaintenance = isDiy || isFuel;
  const diff = metrics ? metrics.monthly.current - metrics.monthly.previous : 0;

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── Header with edit ── */}
      <div className="flex items-start gap-3">
        {/* Back arrow — solo desktop (móvil usa bottom navbar) */}
        <button className="max-sm:hidden sm:flex items-center justify-center p-2 mt-1 rounded-md hover:bg-[var(--bg-secondary)] transition-colors" onClick={() => router.push("/")}><ArrowLeft size={20} /></button>
        <div className="w-14 h-14 sm:w-12 sm:h-12 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
          <Car size={22} style={{ color: "var(--accent)" }} />
        </div>
        <div className="flex-1 min-w-0 pt-1">
          {showEditCar ? (
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <input className="input flex-1 min-w-[100px] text-sm" value={carForm.marca} onChange={e => setCarForm({...carForm, marca: e.target.value})} placeholder="Marca" />
                <input className="input flex-1 min-w-[100px] text-sm" value={carForm.modelo} onChange={e => setCarForm({...carForm, modelo: e.target.value})} placeholder="Modelo" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <input className="input flex-1 min-w-[80px] text-sm" value={carForm.generacion} onChange={e => setCarForm({...carForm, generacion: e.target.value})} placeholder="Gen" />
                <input className="input flex-1 min-w-[80px] text-sm" value={carForm.motor} onChange={e => setCarForm({...carForm, motor: e.target.value})} placeholder="Motor" />
                <input className="input w-16 text-sm" type="number" value={carForm.ano} onChange={e => setCarForm({...carForm, ano: e.target.value})} placeholder="Año" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <input className="input w-24 text-sm" type="number" value={carForm.km_actuales} onChange={e => setCarForm({...carForm, km_actuales: parseInt(e.target.value) || 0})} placeholder="Km" />
                <input className="input w-24 text-sm" value={carForm.puertas} onChange={e => setCarForm({...carForm, puertas: e.target.value})} placeholder="Ptas" />
                <input className="input flex-1 text-sm" value={carForm.estado} onChange={e => setCarForm({...carForm, estado: e.target.value})} placeholder="Estado" />
              </div>
              <div className="flex gap-2">
                <label className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                  Última ITV:
                  <input className="input text-xs w-32" type="date" value={carForm.fecha_ultima_itv} onChange={e => setCarForm({...carForm, fecha_ultima_itv: e.target.value})} />
                </label>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm text-xs" onClick={updateCarData}><Save size={14} /> Guardar</button>
                <button className="btn btn-secondary btn-sm text-xs" onClick={() => setShowEditCar(false)}><X size={14} /> Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold">{car.marca} {car.modelo}</h1>
              <p className="text-sm text-[var(--text-secondary)]">{car.generacion} · {car.ano} · {car.motor}</p>
            </>
          )}
        </div>
        {/* Actions — esquina superior derecha */}
        <div className="flex items-start gap-2 pt-1 flex-shrink-0">
          <a href={`/coches/${car.id}/editar`} className="btn btn-secondary btn-sm text-xs gap-1.5"
            title="Editar vehículo">
            <Edit size={14} /> <span className="hidden sm:inline">Editar</span>
          </a>
          <a href={`/api/car/${carId}/export`} className="btn btn-secondary text-xs flex-shrink-0 hidden sm:inline-flex gap-1.5" download>
            <Download size={14} /> Exportar CSV
          </a>
        </div>
      </div>

      {/* ── Metrics row ── */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="card">
            <p className="text-xs text-[var(--text-muted)] mb-1">Gasto mes</p>
            <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>{fmt(metrics.monthly.current)}€</p>
            <p className={`text-xs flex items-center gap-1 ${diff > 0 ? "text-red-500" : "text-green-600"}`}>
              <TrendingDown size={12} /> {diff > 0 ? "+" : ""}{fmt(diff)}€
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-[var(--text-muted)] mb-1">Proyección anual</p>
            <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>{fmt(metrics.projectedAnnual)}€</p>
            <p className="text-xs text-[var(--text-muted)]">12 × mes actual</p>
          </div>
          <div className="card">
            <p className="text-xs text-[var(--text-muted)] mb-1">Ahorro DIY</p>
            <p className="text-lg font-bold" style={{ color: "var(--success)" }}>{fmt(metrics.diy)}€</p>
            <p className="text-xs text-[var(--text-muted)]">en bricolaje</p>
          </div>
          <div className="card">
            <p className="text-xs text-[var(--text-muted)] mb-1">Consumo</p>
            <p className="text-lg font-bold">{metrics.fuel.l100km !== null ? metrics.fuel.l100km.toFixed(1) : "—"}</p>
            <p className="text-xs text-[var(--text-muted)]">L/100km</p>
          </div>
          <div className="card">
            <p className="text-xs text-[var(--text-muted)] mb-1">Coste/km</p>
            <p className="text-lg font-bold">
              {metrics.totalCostPerKm !== null ? metrics.totalCostPerKm.toFixed(3) : metrics.fuel.costPerKm !== null ? metrics.fuel.costPerKm.toFixed(3) : "—"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {metrics.totalCostPerKm !== null ? "total" : "solo carburante"} €/km
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-[var(--text-muted)] mb-1">Precio gasolina</p>
            <p className="text-lg font-bold">{metrics.fuel.pricePerLiter !== null ? metrics.fuel.pricePerLiter.toFixed(3) : "—"}</p>
            <p className="text-xs text-[var(--text-muted)]">€/L último repostaje</p>
          </div>
        </div>
      )}

      {/* ── Maintenance Alerts ── */}
      {metrics && metrics.alerts.length > 0 && (
        <div className="space-y-2">
          {metrics.alerts.map((a: { type: string; message: string }, i: number) => {
            const isCritical = a.type === 'critical';
            const isWarning = a.type === 'warning';
            return (
              <div key={i} className={`card flex items-center gap-3 py-2 px-3 ${
                isCritical ? 'border-red-300 bg-red-50/50' : isWarning ? 'border-amber-200 bg-amber-50/50' : ''
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCritical ? 'bg-red-100' : 'bg-amber-100'
                }`}>
                  <AlertTriangle size={16} className={isCritical ? 'text-red-500' : 'text-amber-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isCritical ? 'text-red-700' : 'text-amber-700'}`}>
                    {a.type === 'critical' ? 'Crítico' : 'Aviso'}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">{a.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add expense ── */}
      <div>
        <button className="btn btn-primary mb-3" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Añadir gasto
        </button>

        {showForm && (
          <div className="card space-y-4 mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Plus size={14} style={{ color: "var(--accent)" }} /> Nuevo gasto
            </h3>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Tipo</label>
              <select className="input" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value, costeTaller: "", selectedTask: ""})}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Importe (€)</label>
              <div className="input-wrapper">
                <span className="input-icon"><Euro size={16} /></span>
                <input className="input" type="number" step="0.01" min="0" placeholder="0.00" value={form.importe} onChange={e => setForm({...form, importe: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Fecha</label>
              <div className="input-wrapper">
                <span className="input-icon"><Calendar size={16} /></span>
                <input className="input" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Descripción</label>
              <div className="input-wrapper">
                <span className="input-icon"><FileText size={16} /></span>
                <input className="input" placeholder="Ej. Repostaje completo, Cambio de aceite..." value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">Referencia (opcional)</label>
              <div className="input-wrapper">
                <span className="input-icon"><Hash size={16} /></span>
                <input className="input" placeholder="Numero de pieza, referencia..." value={form.referencia} onChange={e => setForm({...form, referencia: e.target.value})} />
              </div>
            </div>
            {isFuel && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Litros</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Fuel size={16} /></span>
                    <input className="input" type="number" step="0.1" placeholder="Ej. 40" value={form.litros} onChange={e => setForm({...form, litros: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Km totales</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Gauge size={16} /></span>
                    <input className="input" type="number" placeholder="Ej. 145000" value={form.km} onChange={e => setForm({...form, km: e.target.value})} />
                  </div>
                </div>
              </div>
            )}
            {isDiy && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Tarea de mantenimiento</label>
                  <select className="input" value={form.selectedTask} onChange={e => {
                    const task = maintenanceTasks.find((t: any) => t.id === parseInt(e.target.value));
                    setForm({...form, selectedTask: e.target.value, descripcion: task ? task.part_name : form.descripcion});
                  }}>
                    <option value="">-- Describelo manualmente --</option>
                    {maintenanceTasks.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.part_name}{t.part_brand ? ` (${t.part_brand})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">Coste estimado taller (€)</label>
                    <div className="input-wrapper">
                      <span className="input-icon"><Wrench size={16} /></span>
                      <input className="input" type="number" step="0.01" placeholder="Ej. 80.00" value={form.costeTaller} onChange={e => setForm({...form, costeTaller: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">Km actuales</label>
                    <div className="input-wrapper">
                      <span className="input-icon"><Gauge size={16} /></span>
                      <input className="input" type="number" placeholder="Ej. 294122" value={form.km} onChange={e => setForm({...form, km: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button className="btn btn-primary flex-1" onClick={submitForm} disabled={saving || !form.importe}>{saving ? "Guardando..." : "Guardar"}</button>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Timeline ── */}
      <div>
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
          <Calendar size={16} style={{ color: "var(--accent)" }} /> Historial
          <Sparkline data={timeline.filter(e => e.tipo === "Carburante").reverse().map(e => e.importe)} />
        </h2>
        <div className="space-y-2">
          {timeline.slice(0, timelineLimit).map(entry => {
            const color = TIPO_COLOR[entry.tipo] || "#6b7280";
            const isEditing = editingId === entry.id;
            return (
              <div key={entry.id} className="card flex items-start gap-3 py-2 px-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{ background: `${color}18` }}>
                  {entry.tipo === "Carburante" ? <Fuel size={14} style={{ color }} /> :
                   entry.tipo?.includes("DIY") ? <Wrench size={14} style={{ color }} /> :
                   <Euro size={14} style={{ color }} />}
                </div>

                {isEditing ? (
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="badge text-xs" style={{ background: `${color}18`, color }}>{entry.tipo}</span>
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">Editando gasto</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1">Tipo</label>
                        <select className="input text-xs" value={editForm.tipo} onChange={e => setEditForm({...editForm, tipo: e.target.value, litros: null, km: null, coste_estimado_taller: null})}>
                          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1">Importe (€)</label>
                        <div className="input-wrapper">
                          <span className="input-icon"><Euro size={14} /></span>
                          <input className="input text-xs" type="number" step="0.01" value={editForm.importe} onChange={e => setEditForm({...editForm, importe: parseFloat(e.target.value) || 0})} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-muted)] mb-1">Fecha</label>
                      <div className="input-wrapper">
                        <span className="input-icon"><Calendar size={14} /></span>
                        <input className="input text-xs" type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-muted)] mb-1">Descripción</label>
                      <div className="input-wrapper">
                        <span className="input-icon"><FileText size={14} /></span>
                        <input className="input text-xs" placeholder="Descripción" value={editForm.descripcion} onChange={e => setEditForm({...editForm, descripcion: e.target.value})} />
                      </div>
                    </div>
                    {editForm.tipo === "Carburante" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-[var(--text-muted)] mb-1">Litros</label>
                          <div className="input-wrapper">
                            <span className="input-icon"><Fuel size={14} /></span>
                            <input className="input text-xs" type="number" step="0.1" placeholder="Litros" value={editForm.litros} onChange={e => setEditForm({...editForm, litros: e.target.value ? parseFloat(e.target.value) : null})} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--text-muted)] mb-1">Km</label>
                          <div className="input-wrapper">
                            <span className="input-icon"><Gauge size={14} /></span>
                            <input className="input text-xs" type="number" placeholder="Km" value={editForm.km} onChange={e => setEditForm({...editForm, km: e.target.value ? parseInt(e.target.value) : null})} />
                          </div>
                        </div>
                      </div>
                    )}
                    {editForm.tipo?.includes("DIY") && (
                      <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1">Coste taller (€)</label>
                        <div className="input-wrapper">
                          <span className="input-icon"><Wrench size={14} /></span>
                          <input className="input text-xs" type="number" step="0.01" placeholder="Coste taller (€)" value={editForm.coste_estimado_taller} onChange={e => setEditForm({...editForm, coste_estimado_taller: e.target.value ? parseFloat(e.target.value) : null})} />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button className="btn btn-primary btn-sm text-xs" onClick={updateExpenseInline}><Save size={12} /> Guardar</button>
                      <button className="btn btn-secondary btn-sm text-xs" onClick={() => setEditingId(null)}><X size={12} /> Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="badge text-xs" style={{ background: `${color}18`, color }}>{entry.tipo}</span>
                      <span className="text-sm font-bold">{fmt(entry.importe)}€</span>
                      <button className="btn p-1 ml-auto text-[var(--text-muted)] hover:text-[var(--accent)]" onClick={() => startEdit(entry)} title="Editar">
                        <Edit size={12} />
                      </button>
                    </div>
                    {entry.descripcion && <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{entry.descripcion}</p>}
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {formatDate(entry.date)}
                      {entry.litros && entry.km && entry.km > 0 && entry.litros > 0
                        ? ` · ${entry.litros}L · ${(entry.importe / entry.litros).toFixed(3)}€/L`
                        : entry.litros ? ` · ${entry.litros}L` : ""}
                      {entry.km && ` · ${entry.km.toLocaleString("es-ES")} km`}
                      {entry.referencia && ` · #${entry.referencia}`}
                      {entry.coste_estimado_taller && ` · Taller: ${fmt(entry.coste_estimado_taller)}€`}
                    </p>
                  </div>
                )}

                {!isEditing && (
                  <button className="btn p-2 text-[var(--text-muted)] hover:text-red-500 flex-shrink-0" onClick={() => deleteExp(entry.id)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
          {timeline.length === 0 && (
            <div className="card text-center py-6"><p className="text-sm text-[var(--text-secondary)]">No hay gastos registrados</p></div>
          )}
          {timeline.length > timelineLimit && (
            <button className="btn btn-secondary w-full text-xs mt-2" onClick={() => setTimelineLimit(timelineLimit + 20)}>
              Cargar más ({timeline.length - timelineLimit} restantes)
            </button>
          )}
        </div>
      </div>

      {/* ── Mantenimiento programado ── */}
      {maintenanceTasks.length > 0 && (
        <div>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            <Clock size={16} style={{ color: "var(--accent)" }} /> Mantenimiento programado
          </h2>
          <div className="space-y-2">
            {maintenanceTasks.map((task: any) => {
              const overdue = task.next_km && task.next_km <= (car?.km_actuales || 0);
              const near = task.next_km && (task.next_km - (car?.km_actuales || 0)) < ((task.interval_km || 15000) * 0.15);
              return (
                <div key={task.id} className={`card flex items-center gap-3 py-2 px-3 ${overdue ? 'border-red-300 bg-red-50/50' : near ? 'border-amber-200 bg-amber-50/50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{task.part_name}</span>
                      {task.part_brand && <span className="badge text-xs">{task.part_brand}</span>}
                      {task.part_model && <span className="text-xs text-[var(--text-muted)]">{task.part_model}</span>}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {task.next_km && <>Proximo: <strong>{task.next_km.toLocaleString("es-ES")} km</strong></>}
                      {task.next_date && <> · {new Date(task.next_date + "T12:00:00").toLocaleDateString("es-ES", { month: "long", year: "numeric" })}</>}
                      {task.current_km && <> · Realizado: {task.current_km.toLocaleString("es-ES")} km</>}
                      {task.interval_km && <> · c/{task.interval_km.toLocaleString("es-ES")} km</>}
                    </p>
                    {task.notes && <p className="text-xs text-[var(--text-muted)] mt-0.5 italic">📝 {task.notes}</p>}
                  </div>
                  <button className={`btn btn-sm text-xs ${overdue ? 'btn-danger' : 'btn-primary'}`} onClick={() => completeTask(task)}>
                    <CheckCircle2 size={14} /> Completar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Guantera ── */}
      <div>
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
          <FileText size={16} style={{ color: "var(--accent)" }} /> Guantera
        </h2>

        <div className="card space-y-3">
          {/* Notes */}
          <textarea
            className="input min-h-[60px] resize-none text-sm"
            placeholder="Anade una nota (referencia de pieza, proximo cambio, ...)"
            value={noteContent}
            onChange={e => setNoteContent(e.target.value)}
          />
          <button className="btn btn-primary btn-sm text-xs" onClick={addNote} disabled={!noteContent.trim()}>
            <Plus size={14} /> Anadir nota
          </button>
          {notes.length > 0 && (
            <div className="space-y-1.5">
              {notes.map(n => (
                <div key={n.id} className="flex items-start gap-2 py-1.5 border-b border-[var(--border-color)] last:border-0">
                  <p className="text-sm flex-1">{n.content}</p>
                  <button className="btn p-1 text-[var(--text-muted)] hover:text-red-500" onClick={() => deleteNote(n.id)}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}

          {/* Divider */}
          <hr className="border-[var(--border-color)]" />

          {/* File upload */}
          <div>
            <input type="file" ref={fileRef} className="hidden" onChange={uploadFile} />
            <button className="btn btn-secondary btn-sm text-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload size={14} /> {uploading ? "Subiendo..." : "Subir archivo"}
            </button>
          </div>
          {attachments.length > 0 && (
            <div className="space-y-1.5">
              {attachments.map(a => (
                <div key={a.id} className="flex items-center gap-2 py-1 text-sm">
                  <Paperclip size={14} className="text-[var(--text-muted)]" />
                  <span className="flex-1 truncate">{a.original_name}</span>
                  <span className="text-xs text-[var(--text-muted)]">{(a.file_size / 1024).toFixed(0)}KB</span>
                  <button className="btn p-1 text-[var(--text-muted)] hover:text-red-500" onClick={() => deleteAttachment(a.id)}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
