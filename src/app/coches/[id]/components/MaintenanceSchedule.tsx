// Lista de tareas de mantenimiento programado del coche.
// Rediseño Ticket 1.5 + 1.6:
//   - 1.5: cada fila muestra icono circular gris + nombre + "Próximo: X km
//     · fecha" + "Realizado: Y km" + barra de progreso fina + "N km
//     restantes" encima. Estado vacío del 1.4 conservado.
//   - 1.6: el componente expone `registerTaskRef` para que el padre
//     (CarDetailClient) pueda resolver `taskId → HTMLElement` y hacer
//     scroll + highlight cuando el usuario pulsa una alerta de
//     mantenimiento. También acepta `flashTaskId` para aplicar la clase
//     `flash-task` a la fila exacta.

import { Clock, ClipboardList, Wrench, ChevronRight } from "lucide-react";
import { fmt0, formatLongMonthYear } from "../lib/format";
import type { Car, MaintenanceTask } from "../lib/types";

interface MaintenanceScheduleProps {
  tasks: MaintenanceTask[];
  car: Car;
  onCompleteTask: (task: MaintenanceTask) => void;
  // Ticket 1.6: el padre pasa un callback para registrar cada fila y
  // poder hacer scroll. El padre mantiene un Map<taskId, HTMLElement>.
  registerTaskRef?: (taskId: number, el: HTMLElement | null) => void;
  // Si está definido, la fila con ese id recibe la clase flash-task para
  // animarse brevemente.
  flashTaskId?: number | null;
  /** Abre el modal con todas las tareas de mantenimiento. */
  onOpenAll?: () => void;
}

const TEXT_DARK = "#211a1e";
const TEXT_GRAY = "#8a8588";

const VISIBLE_LIMIT = 5;

export function sortMaintenanceTasks(tasks: MaintenanceTask[], car: Car): MaintenanceTask[] {
  const kmActuales = car?.km_actuales ?? 0;
  const urgency = (task: MaintenanceTask): number => {
    if (task.next_km !== null && task.next_km !== undefined) return task.next_km - kmActuales;
    if (task.next_date) {
      const days = Math.ceil((new Date(`${task.next_date}T12:00:00`).getTime() - Date.now()) / 86400000);
      return days * 100;
    }
    return Number.POSITIVE_INFINITY;
  };
  return [...tasks].sort((a, b) => urgency(a) - urgency(b) || a.id - b.id);
}

export default function MaintenanceSchedule({
  tasks, car, onCompleteTask,
  registerTaskRef, flashTaskId, onOpenAll,
}: MaintenanceScheduleProps) {
  const isEmpty = tasks.length === 0;
  const kmActuales = car?.km_actuales ?? 0;
  const orderedTasks = sortMaintenanceTasks(tasks, car);
  const visibleTasks = orderedTasks.slice(0, VISIBLE_LIMIT);

  return (
    <div>
      {/* Header con título + "Ver todos" (mockup). "Ver todos" abre un
          modal con la lista completa (no una pantalla nueva). */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-[15px] font-bold flex items-center gap-2 min-w-0">
          <Clock size={16} style={{ color: "var(--accent)" }} />
          <span className="truncate">Mantenimientos programados</span>
        </h2>
        {!isEmpty && orderedTasks.length > VISIBLE_LIMIT && onOpenAll && (
          <button
            type="button"
            className="text-[12px] font-semibold flex items-center gap-1 flex-shrink-0"
            style={{ color: "var(--accent)" }}
            onClick={onOpenAll}
          >
            Ver todos <ChevronRight size={12} />
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {isEmpty && (
          <div className="card flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "#f2f2f3", color: "#4a4548" }}
              aria-hidden
            >
              <ClipboardList size={22} strokeWidth={1.6} />
            </div>
            <p className="text-sm font-semibold" style={{ color: TEXT_DARK }}>
              No hay mantenimientos programados todavía
            </p>
            <p className="text-xs max-w-xs" style={{ color: TEXT_GRAY }}>
              Cuando registres un gasto de tipo «Mantenimiento (DIY/Taller)» se
              creará aquí automáticamente.
            </p>
          </div>
        )}

        {visibleTasks.map((task) => (
          <MaintenanceRow
            key={task.id}
            task={task}
            car={car}
            onComplete={onCompleteTask}
            flashing={flashTaskId === task.id}
            registerRef={(el) => registerTaskRef?.(task.id, el)}
          />
        ))}
      </div>
    </div>
  );
}

interface MaintenanceRowProps {
  task: MaintenanceTask;
  car: Car;
  onComplete: (task: MaintenanceTask) => void;
  flashing?: boolean;
  registerRef?: (el: HTMLElement | null) => void;
}

export function MaintenanceRow({
  task, car, onComplete, flashing, registerRef,
}: MaintenanceRowProps) {
  const kmActuales = car?.km_actuales ?? 0;
  const intervalKm = task.interval_km ?? 15000;
  const restantes =
    task.next_km !== null ? Math.max(task.next_km - kmActuales, 0) : null;
  const overdue = task.next_km !== null && task.next_km <= kmActuales;
  const progressPct =
    task.next_km !== null && intervalKm > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((intervalKm - (restantes ?? 0)) / intervalKm) * 100
            )
          )
        )
      : null;

  return (
    <div
      ref={registerRef}
      className={"card !p-3 flex items-center gap-3 " + (flashing ? "flash-task" : "")}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "#f2f2f3", color: "#4a4548" }}
        aria-hidden
      >
        <Wrench size={18} strokeWidth={1.8} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[14px] font-semibold truncate"
            style={{ color: TEXT_DARK }}
          >
            {task.part_name}
          </span>
          {task.part_brand && (
            <span
              className="badge text-[11px] flex-shrink-0"
              style={{ background: "#f2f2f3", color: TEXT_GRAY }}
            >
              {task.part_brand}
            </span>
          )}
        </div>
        {/* PUNTO 6: dos líneas explícitas para que ningún dato
            importante quede cortado a media palabra. */}
        <p className="text-[11px] mt-0.5 whitespace-normal" style={{ color: TEXT_GRAY }}>
          <span className="block">
            Próximo:{" "}
            <strong style={{ color: TEXT_DARK }}>
              {task.next_km !== null ? `${fmt0(task.next_km)} km` : "—"}
            </strong>
            {task.next_date && (
              <> · {formatLongMonthYear(task.next_date)}</>
            )}
          </span>
          <span className="block">
            Realizado:{" "}
            <strong style={{ color: TEXT_DARK }}>
              {task.current_km !== null ? `${fmt0(task.current_km)} km` : "—"}
            </strong>
            {task.interval_km !== null && task.interval_km !== undefined && (
              <> · cada {fmt0(task.interval_km)} km</>
            )}
          </span>
        </p>
      </div>

      {restantes !== null && progressPct !== null && (
        <div className="flex flex-col items-end gap-1 flex-shrink-0 min-w-[120px]">
          <span
            className="text-[12px] font-semibold"
            style={{ color: overdue ? "#c3423f" : TEXT_DARK }}
          >
            {fmt0(restantes)} km restantes
          </span>
          <div
            className="h-1.5 w-28 rounded-full overflow-hidden"
            style={{ background: "#e5e5ea" }}
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${fmt0(restantes)} kilómetros restantes`}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: "#c3423f" }}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        className="btn p-2 text-[var(--text-muted)] hover:text-[var(--accent)] flex-shrink-0"
        onClick={() => onComplete(task)}
        title="Marcar como completado"
        aria-label={`Completar ${task.part_name}`}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}