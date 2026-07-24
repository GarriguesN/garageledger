"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Subcomponentes del detalle
import CarHeader          from "./CarHeader";
import CarStatsGrid       from "./CarStatsGrid";
import AlertBanner, { AlertTarget } from "./AlertBanner";
import AddExpenseFormFields from "./AddExpenseFormFields";
import ActionButtons       from "./ActionButtons";
import ProgramMaintenanceFormBody, {
  emptyProgramMaintenanceForm,
  ProgramMaintenanceFormState,
} from "./ProgramMaintenanceFormBody";
import ExpenseHistory, {
  ReadOnlyFields, EditFormFields,
} from "./ExpenseHistory";
import MaintenanceSchedule, {
  MaintenanceRow, sortMaintenanceTasks,
} from "./MaintenanceSchedule";
import FullListModal      from "./FullListModal";
import Modal              from "@/components/Modal";
import CompleteMaintenanceModal, {
  emptyCompleteMaintenanceForm,
  CompleteMaintenanceForm,
} from "./CompleteMaintenanceModal";

import { isFuel, TIPO_COLOR } from "../lib/format";
// Helper de red: fetch con parseo + toast de error unificado.
// Ticket 1.4 estandariza el patrón: `res.ok` + `{ error }` en JSON + fallback
// genérico cuando el servidor no devuelve nada legible.
import { fetchJsonWithToast } from "../lib/net";
import { publishMatricula } from "@/components/TopBarContext";
import type { KmStats } from "@/lib/db/cars";
import { MAINTENANCE_PRESETS } from "@/lib/maintenance/presets";
import type {
  Car, CarMetrics, TimelineEntry, MaintenanceTask,
  AddExpenseFormState, EditExpenseFormState,
} from "../lib/types";

interface CarDetailClientProps {
  carId: number;
  initialCar: Car;
  initialMetrics: CarMetrics;
  initialTimeline: TimelineEntry[];
  initialMaintenanceTasks: MaintenanceTask[];
  initialKmStats: KmStats;
  matricula: string;
}

export default function CarDetailClient({
  carId,
  initialCar,
  initialMetrics,
  initialTimeline,
  initialMaintenanceTasks,
  initialKmStats,
  matricula,
}: CarDetailClientProps) {
  // ── Estado inicial ──
  // El CarHeader es ahora solo-lectura: no contiene editor inline. La
  // edición del coche vive en /coches/[id]/editar, accesible desde el
  // menú kebab del header.
  const [car, setCar] = useState<Car>(initialCar);
  const [metrics, setMetrics] = useState<CarMetrics>(initialMetrics);
  const [timeline, setTimeline] = useState<TimelineEntry[]>(initialTimeline);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>(initialMaintenanceTasks);
  const [kmStats, setKmStats] = useState<KmStats>(initialKmStats);

  // Add expense inline
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddExpenseFormState>(() => ({
    tipo: "Carburante", importe: "", date: new Date().toISOString().split("T")[0],
    descripcion: "", referencia: "", litros: "", km: String(initialCar.km_actuales || ""),
    costeTaller: "", selectedTask: "", scheduleNext: false, presetKey: "",
    impuesto_circulacion: false,
  }));
  const [saving, setSaving] = useState(false);

  // Edit existing expense inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditExpenseFormState>({
    id: 0, tipo: "Carburante", importe: 0, date: "", descripcion: "",
  });

  // PUNTO 5: modal "Programar mantenimiento"
  const [showProgramMaintenance, setShowProgramMaintenance] = useState(false);
  const [editingMaintenanceId, setEditingMaintenanceId] = useState<number | null>(null);
  const [programForm, setProgramForm] = useState<ProgramMaintenanceFormState>(
    emptyProgramMaintenanceForm(initialCar.km_actuales)
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
      // quede huérfana.
      const carKm = car?.km_actuales ?? initialCar.km_actuales ?? 0;
      const currentKmRaw = programForm.current_km.trim();
      const currentKm = currentKmRaw === ""
        ? (carKm > 0 ? carKm : null)
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
        preset_key: programForm.preset_key.trim() || null,
      };
      const method = editingMaintenanceId ? "PUT" : "POST";
      const url = editingMaintenanceId ? `/api/maintenance?id=${editingMaintenanceId}` : "/api/maintenance";
      const res = await fetchJsonWithToast(
        url,
        { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
          fallback: "No se pudo guardar el mantenimiento. Inténtalo de nuevo." },
        setToast,
      );
      if (!res.ok) return;
      setShowProgramMaintenance(false);
      // El form se reiniciará con el car.km_actuales actual cuando el
      // usuario vuelva a abrir el modal.
      setProgramForm(emptyProgramMaintenanceForm(car?.km_actuales ?? initialCar.km_actuales));
      setToast({ msg: `${part_name} programado`, type: "success" });
      setTimeout(() => setToast(null), 2500);
      load();
    } finally {
      setProgramSaving(false);
    }
  };

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
  // Usamos openExpenseForm para que el form se inicialice con el
  // car.km_actuales actual, no con el valor cacheado al mount.
  useEffect(() => {
    const handler = () => {
      if (showForm) setShowForm(false);
      else openExpenseForm();
    };
    window.addEventListener("garageledger:car-nav-add-expense", handler);
    return () => window.removeEventListener("garageledger:car-nav-add-expense", handler);
  }, [showForm]);

  // Modales de "Ver todos" para gastos y mantenimiento. Cada uno abre
  // FullListModal con la lista completa, sin construir páginas nuevas.
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [showAllMaintenance, setShowAllMaintenance] = useState(false);

  // Ticket 1.14: modal de completar tarea (sustituye a window.prompt).
  const [taskToComplete, setTaskToComplete] = useState<MaintenanceTask | null>(null);
  const [completeForm, setCompleteForm] = useState<CompleteMaintenanceForm>(
    emptyCompleteMaintenanceForm(initialCar.km_actuales),
  );
  const [completing, setCompleting] = useState(false);

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
          maintenanceTasks?: MaintenanceTask[]; kmStats?: KmStats;
        };
        setCar(d.car);
        setMetrics(d.metrics);
        setTimeline(d.timeline || []);
        setMaintenanceTasks(d.maintenanceTasks || []);
        if (d.kmStats) setKmStats(d.kmStats);
      });
  };

  // Open expense form: reset km to current car.km_actuales so the user
  // always sees the latest odometer, not a stale value from a previous
  // session or earlier load. Ticket 1.14 follow-up.
  const openExpenseForm = () => {
    // Reset del ref cada vez que abrimos el modal. Sin esto, un segundo
    // open tras un error previo quedaría bloqueado por submittingRef=true.
    submittingRef.current = false;
    setForm({
      tipo: "Carburante", importe: "", date: new Date().toISOString().split("T")[0],
      descripcion: "", referencia: "", litros: "",
      km: String(car?.km_actuales ?? initialCar.km_actuales ?? ""),
      costeTaller: "", selectedTask: "", scheduleNext: false, presetKey: "",
      impuesto_circulacion: false,
    });
    setShowForm(true);
  };
  const openProgramMaintenance = () => {
    setEditingMaintenanceId(null);
    setProgramError(null);
    setProgramForm(emptyProgramMaintenanceForm(car?.km_actuales ?? initialCar.km_actuales));
    setShowProgramMaintenance(true);
  };

  const editMaintenanceTask = (task: MaintenanceTask) => {
    setEditingMaintenanceId(task.id);
    setProgramForm({
      part_name: task.part_name,
      current_km: task.current_km != null ? String(task.current_km) : "",
      next_km: task.next_km != null ? String(task.next_km) : "",
      next_date: task.next_date || "",
      interval_km: task.interval_km != null ? String(task.interval_km) : "",
      interval_months: task.interval_months != null ? String(task.interval_months) : "",
      part_brand: task.part_brand || "",
      preset_key: task.preset_key || "",
    });
    setProgramError(null);
    setShowProgramMaintenance(true);
  };

  const deleteMaintenanceTask = async (task: MaintenanceTask) => {
    if (!confirm(`Eliminar tarea "${task.part_name}"?`)) return;
    const res = await fetchJsonWithToast(
      `/api/maintenance?id=${task.id}`,
      { method: "DELETE", headers: { "Content-Type": "application/json" },
        fallback: "No se pudo eliminar la tarea. Inténtalo de nuevo." },
      setToast,
    );
    if (!res.ok) return;
    setToast({ msg: "Tarea eliminada", type: "success" });
    setTimeout(() => setToast(null), 2500);
    load();
  };
  const closeProgramMaintenance = () => {
    setEditingMaintenanceId(null);
    setProgramError(null);
    setEditingMaintenanceId(null);
    setShowProgramMaintenance(false);
    setProgramError(null);
  };

  // ── Handlers (idénticos a los del orquestador anterior) ──
  // Ref sincrónica para evitar doble-envío. setSaving() es asíncrono
  // (React agenda el re-render), así que durante la primera ventana de
  // microsegundos del click el botón sigue "habilitado" y un segundo tap
  // rápido crea dos gastos idénticos. El ref bloquea ambos submits con
  // un check sincrónico. Patrón estándar para forms críticos.
  const submittingRef = { current: false };
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
    if (form.tipo.includes("DIY") && form.costeTaller) body.costeTaller = parseFloat(form.costeTaller);
    // Ticket 1.17: si el usuario eligió un preset del catálogo, lo
    // mandamos al backend para que guarde el preset_key y permita la
    // detección automática de tareas pendientes (Ticket 1.16-fix-b).
    if (form.presetKey) body.presetKey = form.presetKey;
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
            body.scheduleNext = form.scheduleNext;
          }
        }
      } else {
        body.maintenanceTaskId = parseInt(form.selectedTask);
        body.scheduleNext = form.scheduleNext;
      }
    }
    // Ticket 1.20: si es Impuestos y el checkbox está marcado, el backend
    // actualiza cars.fecha_impuesto_circulacion con la fecha del gasto.
    if (form.tipo === "Impuestos" && form.impuesto_circulacion) {
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
    setToast({ msg: editingId ? "Gasto actualizado" : "Gasto guardado", type: "success" });
    setTimeout(() => setToast(null), 2500);
    load();      // refresca car.km_actuales; el form se reinicia al reabrir via openExpenseForm
  };

  // Reset del ref al cerrar el modal (para que un nuevo modal pueda guardar).
  const closeExpenseForm = () => {
    submittingRef.current = false;
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (entry: TimelineEntry) => {
    // Abre el modal de gasto con los datos del entry precargados.
    // Al guardar, usamos PUT /api/expenses si editingId está seteado.
    setEditingId(entry.id);
    setForm({
      tipo: entry.tipo,
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
  const updateExpenseInline = async () => {
    // Obsoleto — la edición ahora abre el modal principal, no inline.
    // Mantenemos el stub vacío para no romper referencias en ExpenseHistory
    // hasta que migremos ese componente también.
  };
  const deleteExp = async (id: number) => {
    if (!confirm("Eliminar gasto?")) return;
    const res = await fetchJsonWithToast(
      `/api/expenses?id=${id}`,
      { method: "DELETE", headers: { "Content-Type": "application/json" },
        fallback: "No se pudo eliminar el gasto. Inténtalo de nuevo." },
      setToast,
    );
    if (!res.ok) return;
    setToast({ msg: "Gasto eliminado", type: "success" });
    setTimeout(() => setToast(null), 2500);
    load();
  };
  // Ticket 1.14: modal de completar tarea. Abre el modal con km_actuales
  // pre-rellenado; el guardado llama a POST /api/maintenance y refresca.
  const openCompleteTask = (task: MaintenanceTask) => {
    setCompleteForm(emptyCompleteMaintenanceForm(car?.km_actuales ?? initialCar.km_actuales));
    setTaskToComplete(task);
  };
  const submitCompleteTask = async () => {
    if (!taskToComplete) return;
    setCompleting(true);
    const res = await fetchJsonWithToast(
      "/api/maintenance",
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          id: taskToComplete.id,
          currentKm: completeForm.km,
          currentDate: completeForm.date,
        }),
        fallback: `No se pudo completar "${taskToComplete.part_name}". Inténtalo de nuevo.` },
      setToast,
    );
    setCompleting(false);
    if (!res.ok) return;
    setToast({ msg: `${taskToComplete.part_name} completado`, type: "success" });
    setTimeout(() => setToast(null), 2500);
    setTaskToComplete(null);
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
      <CarStatsGrid carId={carId} metrics={metrics} kmStats={kmStats} />

      {/* Alerts (informativas: no son botones, no llevan a ningún sitio) */}
      <AlertBanner metrics={metrics} />

      {/* Add expense */}
      <ActionButtons
        onAddExpense={() => {
          if (showForm) setShowForm(false);
          else openExpenseForm();
        }}
        onProgramMaintenance={openProgramMaintenance}
      />
      {/* PUNTO 5 / Ticket 1.13: Añadir gasto y Programar mantenimiento
          son modales reales (position: fixed). El botón inline y el [+] del
          navbar contextual del coche abren el mismo modal, así el modal
          siempre aparece centrado en el viewport visible, no en la posición
          donde estaba el botón. */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Añadir gasto"
        mainId="page-main"
      >
        <AddExpenseFormFields
          carId={carId}
          form={form}
          maintenanceTasks={maintenanceTasks}
          saving={saving}
          onChange={setForm}
          onSubmit={() => { submitForm(); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
      <Modal
        open={showProgramMaintenance}
        onClose={closeProgramMaintenance}
        title="Programar mantenimiento"
        mainId="page-main"
      >
        <ProgramMaintenanceFormBody
          form={programForm}
          saving={programSaving}
          error={programError}
          carKm={car?.km_actuales ?? initialCar.km_actuales ?? 0}
          onChange={setProgramForm}
          onSubmit={() => { submitProgramMaintenance(); }}
          onCancel={closeProgramMaintenance}
        />
      </Modal>

      {/* Historial */}
      <ExpenseHistory
        timeline={timeline}
        onStartEdit={startEdit}
        onDelete={deleteExp}
        onOpenAll={() => setShowAllExpenses(true)}
      />

      {/* Mantenimiento */}
      <MaintenanceSchedule
        tasks={maintenanceTasks}
        car={car}
        onCompleteTask={openCompleteTask}
        registerTaskRef={registerTaskRef}
        flashTaskId={flashTaskId}
        onOpenAll={() => setShowAllMaintenance(true)}
        onEdit={editMaintenanceTask}
        onDelete={(taskId) => {
          const t = maintenanceTasks.find(x => x.id === taskId);
          if (t) deleteMaintenanceTask(t);
        }}
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
            return (
              <div key={entry.id} className="card !p-3">
                <ReadOnlyFields
                  entry={entry}
                  color={color}
                  isExpanded={false}
                  onToggle={() => {}}
                  onStartEdit={() => {
                    setShowAllExpenses(false);
                    startEdit(entry);
                  }}
                  onDelete={() => deleteExp(entry.id)}
                />
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
              onComplete={openCompleteTask}
              isExpanded={false}
              onToggle={() => {}}
            />
          ))}
        </div>
      </FullListModal>

      {/* Ticket 1.14: modal de completar mantenimiento (sustituye a window.prompt). */}
      <Modal
        open={!!taskToComplete}
        onClose={() => setTaskToComplete(null)}
        title="Completar mantenimiento"
        mainId="page-main"
      >
        {taskToComplete && (
          <CompleteMaintenanceModal
            task={taskToComplete}
            carKm={completeForm.km}
            saving={completing}
            onChange={(km, date) => setCompleteForm({ km, date })}
            onSubmit={submitCompleteTask}
            onCancel={() => setTaskToComplete(null)}
          />
        )}
      </Modal>
    </div>
  );
}
