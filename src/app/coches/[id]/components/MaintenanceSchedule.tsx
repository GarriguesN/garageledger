import { Clock, CheckCircle2 } from "lucide-react";
import { fmt0, formatLongMonthYear } from "../lib/format";
import type { Car, MaintenanceTask } from "../lib/types";

interface MaintenanceScheduleProps {
  tasks: MaintenanceTask[];
  car: Car;
  onCompleteTask: (task: MaintenanceTask) => void;
}

export default function MaintenanceSchedule({
  tasks, car, onCompleteTask,
}: MaintenanceScheduleProps) {
  if (tasks.length === 0) return null;

  return (
    <div>
      <h2 className="text-base font-bold mb-3 flex items-center gap-2">
        <Clock size={16} style={{ color: "var(--accent)" }} /> Mantenimiento programado
      </h2>
      <div className="space-y-2">
        {tasks.map((task) => {
          const overdue = task.next_km !== null && task.next_km <= (car?.km_actuales || 0);
          const near =
            task.next_km !== null &&
            (task.next_km - (car?.km_actuales || 0)) <
              ((task.interval_km || 15000) * 0.15);
          return (
            <div
              key={task.id}
              className={`card flex items-center gap-3 py-2 px-3 ${
                overdue
                  ? "border-red-300 bg-red-50/50"
                  : near
                  ? "border-amber-200 bg-amber-50/50"
                  : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{task.part_name}</span>
                  {task.part_brand && (
                    <span className="badge text-xs">{task.part_brand}</span>
                  )}
                  {task.part_model && (
                    <span className="text-xs text-[var(--text-muted)]">{task.part_model}</span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {task.next_km !== null && (
                    <>
                      Proximo: <strong>{fmt0(task.next_km)} km</strong>
                    </>
                  )}
                  {task.next_date && (
                    <> · {formatLongMonthYear(task.next_date)}</>
                  )}
                  {task.current_km !== null && <> · Realizado: {fmt0(task.current_km)} km</>}
                  {task.interval_km !== null && <> · c/{fmt0(task.interval_km)} km</>}
                </p>
                {task.notes && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 italic">📝 {task.notes}</p>
                )}
              </div>
              <button
                className={`btn btn-sm text-xs ${overdue ? "btn-danger" : "btn-primary"}`}
                onClick={() => onCompleteTask(task)}
              >
                <CheckCircle2 size={14} /> Completar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
