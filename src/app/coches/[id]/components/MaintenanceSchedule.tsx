// Lista de tareas de mantenimiento programado del coche.
// Rediseño Ticket 1.5: cada fila muestra icono circular gris + nombre +
// "Próximo: X km · fecha" + "Realizado: Y km" + barra de progreso fina
// roja a la derecha con "N km restantes" encima. Mantiene el estado vacío
// del Ticket 1.4 con el mismo lenguaje visual nuevo.
//
// NO se tocan handlers ni cálculos nuevos: los datos vienen de
// MaintenanceTask (next_km, current_km, interval_km). El cálculo de
// "km restantes" y el porcentaje para la barra usan los mismos campos que
// ya consumía el componente (next_km - car.km_actuales).

import { Clock, ClipboardList, Wrench, ChevronRight } from "lucide-react";
import { fmt0, formatLongMonthYear } from "../lib/format";
import type { Car, MaintenanceTask } from "../lib/types";

interface MaintenanceScheduleProps {
  tasks: MaintenanceTask[];
  car: Car;
  onCompleteTask: (task: MaintenanceTask) => void;
}

const TEXT_DARK = "#211a1e";
const TEXT_GRAY = "#8a8588";

export default function MaintenanceSchedule({
  tasks, car, onCompleteTask,
}: MaintenanceScheduleProps) {
  const isEmpty = tasks.length === 0;
  const kmActuales = car?.km_actuales ?? 0;

  return (
    <div>
      {/* Header con título + "Ver todos" (mockup). "Ver todos" queda
          disabled — no existe pantalla /coches/[id]/mantenimiento; cuando
          exista, se enchufa aquí (Ticket 1.5 no introduce navegación). */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-[15px] font-bold flex items-center gap-2 min-w-0">
          <Clock size={16} style={{ color: "var(--accent)" }} />
          <span className="truncate">Mantenimientos programados</span>
        </h2>
        {!isEmpty && (
          <button
            type="button"
            className="text-[12px] font-semibold flex items-center gap-1 flex-shrink-0"
            style={{ color: "var(--accent)" }}
            disabled
            title="Pendiente: pantalla de mantenimiento completo"
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

        {tasks.map((task) => {
          // Cálculo de "km restantes" y porcentaje para la barra.
          // Si la tarea ya está vencida (next_km <= km_actuales), restantes
          // es 0 y la barra se pinta llena en rojo. Si no hay next_km o
          // interval_km, la barra se oculta.
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

          const barColor = overdue ? "#c3423f" : "#c3423f"; // mockup: siempre rojo

          return (
            <div
              key={task.id}
              className="card !p-3 flex items-center gap-3"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#f2f2f3", color: "#4a4548" }}
                aria-hidden
              >
                <Wrench size={18} strokeWidth={1.8} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[14px] font-semibold truncate"
                    style={{ color: TEXT_DARK }}
                  >
                    {task.part_name}
                  </span>
                  {task.part_brand && (
                    <span
                      className="badge text-[11px]"
                      style={{ background: "#f2f2f3", color: TEXT_GRAY }}
                    >
                      {task.part_brand}
                    </span>
                  )}
                </div>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: TEXT_GRAY }}>
                  {task.next_km !== null && (
                    <>Próximo: <strong style={{ color: TEXT_DARK }}>{fmt0(task.next_km)} km</strong></>
                  )}
                  {task.next_date && (
                    <> · {formatLongMonthYear(task.next_date)}</>
                  )}
                  {task.current_km !== null && (
                    <> · Realizado: <strong style={{ color: TEXT_DARK }}>{fmt0(task.current_km)} km</strong></>
                  )}
                </p>
              </div>

              {/* Barra de progreso fina + km restantes encima */}
              {restantes !== null && progressPct !== null && (
                <div className="flex flex-col items-end gap-1 flex-shrink-0 min-w-[120px]">
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: overdue ? "#c3423f" : TEXT_DARK }}
                  >
                    {fmt0(restantes)} km restantes
                  </span>
                  <div
                    className="h-1 w-28 rounded-full overflow-hidden"
                    style={{ background: "#f2f2f3" }}
                    role="progressbar"
                    aria-valuenow={progressPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${progressPct}%`, background: barColor }}
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                className="btn p-2 text-[var(--text-muted)] hover:text-[var(--accent)] flex-shrink-0"
                onClick={() => onCompleteTask(task)}
                title="Marcar como completado"
                aria-label={`Completar ${task.part_name}`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}