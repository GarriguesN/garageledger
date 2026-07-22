"use client";

// Botones de acción principales del detalle del coche.
// Rediseño Ticket 1.5: "+ Añadir gasto" (rojo, ancho flexible).
//
// El mockup también muestra "Programar mantenimiento" (outline, al lado),
// pero no existe pantalla / ruta / endpoint para crear tareas de
// mantenimiento en esta fase. Cuando exista la acción (futuro ticket),
// se añadirá el segundo botón aquí reutilizando exactamente el mismo
// patrón visual.

import { Plus } from "lucide-react";

interface ActionButtonsProps {
  onAddExpense: () => void;
}

export default function ActionButtons({ onAddExpense }: ActionButtonsProps) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        className="btn flex-1 h-11 rounded-xl text-sm font-semibold"
        style={{ background: "var(--accent)", color: "#fff" }}
        onClick={onAddExpense}
      >
        <Plus size={16} strokeWidth={2.2} /> Añadir gasto
      </button>
    </div>
  );
}