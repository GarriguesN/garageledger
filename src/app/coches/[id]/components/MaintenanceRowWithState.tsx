"use client";

// Fila de mantenimiento con acordeón + swipe para el modal "Ver todos".

import { useState } from "react";
import { Clock, ClipboardList, ChevronRight, Edit, Trash2 } from "lucide-react";
import type { Car, MaintenanceTask } from "../lib/types";
import SwipeableRow from "./SwipeableRow";
import { getIconForKey } from "@/lib/maintenance/presets";

interface Props {
  task: MaintenanceTask;
  car: Car;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TEXT_DARK = "#211a1e";
const TEXT_GRAY = "#8a8588";

export default function MaintenanceRowWithState({
  task, car, onComplete, onEdit, onDelete,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const Icon = getIconForKey(task.icon_key) || ClipboardList;
  const color = "#d4956a";
  const panelId = `maint-row-${task.id}`;

  return (
    <SwipeableRow onEdit={onEdit} onDelete={onDelete}>
      <div className="rounded-xl border border-[var(--border-color)] overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}1a`, color }}
            aria-hidden
          >
            <Icon size={18} strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color }}>
                {task.part_name}
              </span>
            </div>
            <p className="text-[11px] mt-0.5 truncate" style={{ color: TEXT_GRAY }}>
              Próximo: {task.next_km ? `${fmt0Display(task.next_km)} km` : task.next_date || "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={expanded ? "Contraer" : "Expandir"}
            className="flex-shrink-0 p-1 -mr-1 rounded transition-transform"
            style={{
              color: TEXT_GRAY,
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 200ms ease",
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        {expanded && (
          <div className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 flex gap-2">
            <button
              type="button"
              onClick={onComplete}
              className="flex-1 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold"
            >
              Completar
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-sm font-semibold"
              style={{ color: TEXT_DARK }}
            >
              <Edit size={16} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-2 rounded-lg text-sm font-semibold"
              style={{ color: "#c3423f" }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </SwipeableRow>
  );
}

function fmt0Display(n: number) {
  return n.toLocaleString("es-ES");
}
