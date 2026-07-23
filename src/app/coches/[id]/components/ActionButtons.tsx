"use client";

// Botones de acción principales del detalle del coche.
//
// Mockup: dos botones en la misma fila — "+ Añadir gasto" (primary,
// rojo, ancho flexible) y "Programar mantenimiento" (outline, mismo
// tamaño, borde gris). El outline usa border + texto del accent y fondo
// transparente, para diferenciarlo del primary sin pelear con él.

import { Plus, Calendar } from "lucide-react";

interface ActionButtonsProps {
  onAddExpense: () => void;
  onProgramMaintenance: () => void;
}

export default function ActionButtons({
  onAddExpense,
  onProgramMaintenance,
}: ActionButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        className="btn h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
        style={{ background: "var(--accent)", color: "#fff" }}
        onClick={onAddExpense}
      >
        <Plus size={16} strokeWidth={2.2} /> Añadir gasto
      </button>
      <button
        type="button"
        className="btn h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
        style={{
          background: "#fff",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-color)",
        }}
        onClick={onProgramMaintenance}
      >
        <Calendar size={16} strokeWidth={2.2} /> Programar mantenimiento
      </button>
    </div>
  );
}
