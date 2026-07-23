"use client";

// Modal full-screen con la lista completa de gastos (Timeline) o de
// tareas de mantenimiento. Reutilizado por CarDetailClient cuando hay
// más de 5 elementos y el usuario pulsa "Ver todos" en cualquiera de
// las dos secciones.
//
// Patrón visual: overlay oscuro semitransparente + sheet blanco con
// scroll interno, header sticky con título + botón cerrar, footer con
// contador de elementos. No es un modal pequeño: ocupa casi toda la
// pantalla porque la lista puede ser larga.

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface FullListModalProps {
  open: boolean;
  title: string;
  totalCount: number;
  onClose: () => void;
  children: React.ReactNode;
}

export default function FullListModal({
  open, title, totalCount, onClose, children,
}: FullListModalProps) {
  // Cierra con Escape (mismo patrón que el modal de notificaciones).
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-primary)] w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 h-12 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
          <h2 className="text-[15px] font-bold truncate flex-1 min-w-0">{title}</h2>
          <span className="text-xs text-[var(--text-muted)] mr-3 flex-shrink-0">{totalCount}</span>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--bg-secondary)]"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
