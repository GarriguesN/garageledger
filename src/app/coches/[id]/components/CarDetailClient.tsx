"use client";

import { useEffect, useLayoutEffect, useState } from "react";

// Subcomponentes del detalle
import CarHeader          from "./CarHeader";
import CarStatsGrid       from "./CarStatsGrid";
import AlertBanner        from "./AlertBanner";
import AddExpenseFormFields from "./AddExpenseFormFields";
import ExpenseHistoryRow from "./ExpenseHistoryRow";
import MaintenanceRowWithState from "./MaintenanceRowWithState";
import ActionButtons       from "./ActionButtons";
import ProgramMaintenanceFormBody from "./ProgramMaintenanceFormBody";
import ExpenseHistory      from "./ExpenseHistory";
import MaintenanceSchedule, { sortMaintenanceTasks } from "./MaintenanceSchedule";
import FullListModal      from "./FullListModal";
import Modal              from "@/components/Modal";
import CompleteMaintenanceModal from "./CompleteMaintenanceModal";
import DocumentsSection    from "./DocumentsSection";

// Ticket 1.4: helper de red — fetch con parseo + toast de error unificado.
import { fetchJsonWithToast } from "../lib/net";
import { publishMatricula } from "@/components/TopBarContext";
import { publishCarView, useCarViewRequests, type CarView } from "@/components/CarViewContext";
import type { KmStats } from "@/lib/db/cars";
import type { CarDocuments } from "@/lib/db/attachments";
import type {
  Car, CarMetrics, TimelineEntry, MaintenanceTask, Note,
} from "../lib/types";

import { useToast } from "../hooks/useToast";
import { useExpenseForm } from "../hooks/useExpenseForm";
import { useMaintenanceForm } from "../hooks/useMaintenanceForm";
import { useCompleteTask } from "../hooks/useCompleteTask";
import { useAlertScroll } from "../hooks/useAlertScroll";
import { useDocuments } from "../hooks/useDocuments";

interface CarDetailClientProps {
  carId: number;
  initialCar: Car;
  initialMetrics: CarMetrics;
  initialTimeline: TimelineEntry[];
  initialMaintenanceTasks: MaintenanceTask[];
  initialKmStats: KmStats;
  initialNotes: Note[];
  initialDocuments: CarDocuments;
  matricula: string;
}

export default function CarDetailClient({
  carId,
  initialCar,
  initialMetrics,
  initialTimeline,
  initialMaintenanceTasks,
  initialKmStats,
  initialNotes,
  initialDocuments,
  matricula,
}: CarDetailClientProps) {
  // ── Estado central ──
  // El CarHeader es solo-lectura: no contiene editor inline. La edición
  // del coche vive en /coches/[id]/editar, accesible desde el menú kebab
  // del header. Este estado se comparte entre todos los hooks de abajo
  // (cada uno gestiona su propio slice de formulario/modal, pero todos
  // leen `car` y refrescan vía `load()` tras mutar).
  const [car, setCar] = useState<Car>(initialCar);
  const [metrics, setMetrics] = useState<CarMetrics>(initialMetrics);
  const [timeline, setTimeline] = useState<TimelineEntry[]>(initialTimeline);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>(initialMaintenanceTasks);
  const [kmStats, setKmStats] = useState<KmStats>(initialKmStats);

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
          notes?: Note[]; documents?: CarDocuments;
        };
        setCar(d.car);
        setMetrics(d.metrics);
        setTimeline(d.timeline || []);
        setMaintenanceTasks(d.maintenanceTasks || []);
        if (d.kmStats) setKmStats(d.kmStats);
        if (d.notes) setNotes(d.notes);
        if (d.documents) setDocuments(d.documents);
      });
  };

  const { toast, setToast, showToast, showUndoToast, undoTimer } = useToast();

  const {
    notes, setNotes, documents, setDocuments, uploading,
    addNote, deleteNote, uploadDocument, updateDocumentMeta, deleteDocument,
  } = useDocuments({ carId, initialNotes, initialDocuments, load, setToast, showToast, showUndoToast });

  const {
    showForm, setShowForm, form, setForm, saving,
    openExpenseForm, closeExpenseForm, startEdit, submitForm,
    deleteExpWithUndo,
  } = useExpenseForm({ carId, car, initialCar, timeline, load, setToast, showToast, showUndoToast });

  const {
    showProgramMaintenance, programForm, setProgramForm,
    programSaving, programError, openProgramMaintenance, editMaintenanceTask,
    closeProgramMaintenance, submitProgramMaintenance, deleteMaintenanceTaskWithUndo,
  } = useMaintenanceForm({ carId, car, initialCar, load, setToast, showToast, showUndoToast });

  const {
    taskToComplete, setTaskToComplete, completeForm, setCompleteForm,
    completing, openCompleteTask, submitCompleteTask,
  } = useCompleteTask({ car, initialCar, load, setToast, showToast });

  const { registerTaskRef, flashTaskId } = useAlertScroll({ carId, setToast });

  // Ticket: el TopBar muestra la matrícula del coche. Publicamos la
  // matrícula antes del primer paint para que el TopBar (que también
  // vive en el mismo árbol cliente) reciba el evento a tiempo.
  useLayoutEffect(() => {
    publishMatricula(matricula || null);
    return () => publishMatricula(null);
  }, [matricula]);

  // Pestaña activa (Resumen / Documentos). El navbar contextual pinta su
  // botón activo en rojo a partir de lo que publicamos aquí, y nos manda
  // comandos de cambio de pestaña cuando el usuario pulsa el otro botón —
  // ver CarViewContext.tsx. "resumen" es el estado inicial al entrar al
  // detalle del coche.
  const [activeView, setActiveView] = useState<CarView>("resumen");
  useCarViewRequests(setActiveView);
  useEffect(() => {
    publishCarView(activeView);
  }, [activeView]);
  useEffect(() => () => publishCarView(null), []);

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
  }, [showForm, setShowForm, openExpenseForm]);

  // Modales de "Ver todos" para gastos y mantenimiento. Cada uno abre
  // FullListModal con la lista completa, sin construir páginas nuevas.
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [showAllMaintenance, setShowAllMaintenance] = useState(false);

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all flex items-center gap-3 ${
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          <span>{toast.msg}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                if (undoTimer.current) clearTimeout(undoTimer.current);
                toast.undo!();
              }}
              className="ml-2 px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-bold uppercase tracking-wide"
            >
              Deshacer
            </button>
          )}
        </div>
      )}

      {/* Header — solo lectura. Editar vive en /coches/[id]/editar. Siempre
          visible: es común a ambas pestañas (Resumen y Documentos). */}
      <CarHeader car={car} />

      {/* Pestaña Resumen — métricas, alertas, historial y mantenimiento. */}
      {activeView === "resumen" && (
        <>
          <CarStatsGrid carId={carId} metrics={metrics} kmStats={kmStats} />

          <AlertBanner metrics={metrics} />

          <ActionButtons
            onAddExpense={() => {
              if (showForm) setShowForm(false);
              else openExpenseForm();
            }}
            onProgramMaintenance={openProgramMaintenance}
          />

          <ExpenseHistory
            timeline={timeline}
            onStartEdit={startEdit}
            onDelete={deleteExpWithUndo}
            onOpenAll={() => setShowAllExpenses(true)}
          />

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
              if (t) deleteMaintenanceTaskWithUndo(t);
            }}
          />
        </>
      )}

      {/* Pestaña Documentos — reemplaza el Resumen entero, no hace scroll
          dentro de la misma pestaña (ver CarViewContext.tsx). */}
      {activeView === "documentos" && (
        <DocumentsSection
          documents={documents}
          notes={notes}
          uploading={uploading}
          uploadDocument={uploadDocument}
          updateDocumentMeta={updateDocumentMeta}
          deleteDocument={deleteDocument}
          addNote={addNote}
          deleteNote={deleteNote}
        />
      )}

      {/* Modales: independientes de la pestaña activa — el botón [+] del
          navbar contextual debe poder abrir "Añadir gasto" sin importar si
          se está viendo Resumen o Documentos. */}
      {/* PUNTO 5 / Ticket 1.13: Añadir gasto y Programar mantenimiento
          son modales reales (position: fixed). El botón inline y el [+] del
          navbar contextual del coche abren el mismo modal, así el modal
          siempre aparece centrado en el viewport visible, no en la posición
          donde estaba el botón. */}
      <Modal
        open={showForm}
        onClose={closeExpenseForm}
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
          onCancel={closeExpenseForm}
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

      {/* Modal "Ver todos" — gastos */}
      <FullListModal
        open={showAllExpenses}
        title="Historial completo de gastos"
        totalCount={timeline.length}
        onClose={() => setShowAllExpenses(false)}
      >
        <div className="space-y-1.5">
          {timeline.map((entry) => (
            <ExpenseHistoryRow
              key={entry.id}
              entry={entry}
              onStartEdit={() => {
                setShowAllExpenses(false);
                startEdit(entry);
              }}
              onDelete={() => deleteExpWithUndo(entry.id)}
            />
          ))}
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
            <MaintenanceRowWithState
              key={task.id}
              task={task}
              car={car}
              onComplete={() => {
                setShowAllMaintenance(false);
                openCompleteTask(task);
              }}
              onEdit={() => {
                setShowAllMaintenance(false);
                editMaintenanceTask(task);
              }}
              onDelete={() => deleteMaintenanceTaskWithUndo(task)}
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
