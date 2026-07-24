"use client";

// SwipeableRow: tarjeta que se puede arrastrar horizontalmente.
// Deslizar a la DERECHA (deltaX > 0) → revela "Eliminar" a la izquierda
// y al soltar sobre umbral dispara onDelete(). Al soltar por debajo del
// umbral vuelve a posición original.
// Deslizar a la IZQUIERDA (deltaX < 0) → revela "Editar" a la derecha
// y al soltar sobre umbral dispara onEdit().
//
// Punto 7 (Ticket 1.16): para distinguir swipe horizontal de scroll
// vertical NO usamos preventDefault hasta que el gesto se ha "comprometido".
// Compromiso: |deltaX| > 8px AND |deltaX| > |deltaY| * 1.5. Antes de eso,
// dejamos pasar el evento para que el scroll vertical funcione normal.

import { useRef, useState, type ReactNode } from "react";
import { Trash2, Pencil } from "lucide-react";

interface SwipeableRowProps {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
}

const SWIPE_THRESHOLD = 80;       // px a desplazar antes de confirmar acción
const SWIPE_MAX = 120;            // px máximos de desplazamiento visual
const COMMIT_DELTA_MIN = 8;       // px mínimos para considerarlo swipe horizontal
const COMMIT_RATIO = 1.5;         // ratio deltaX/deltaY para considerarlo horizontal

export default function SwipeableRow({ children, onEdit, onDelete }: SwipeableRowProps) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const committed = useRef(false);  // true si ya detectamos gesto horizontal
  const [offset, setOffset] = useState(0);  // desplazamiento visual actual
  const [fired, setFired] = useState<null | "edit" | "delete">(null);  // animación post-release

  function onStart(e: React.TouchEvent | React.MouseEvent) {
    const point = "touches" in e ? e.touches[0] : e;
    startX.current = point.clientX;
    startY.current = point.clientY;
    committed.current = false;
    setFired(null);
  }

  function onMove(e: React.TouchEvent | React.MouseEvent) {
    if (startX.current === null || startY.current === null) return;
    const point = "touches" in e ? e.touches[0] : e;
    const dx = point.clientX - startX.current;
    const dy = point.clientY - startY.current;
    if (!committed.current) {
      // Punto 7: distinguir swipe horizontal de scroll vertical. Sólo
      // nos comprometemos si deltaX supera deltaY significativamente.
      if (Math.abs(dx) > COMMIT_DELTA_MIN && Math.abs(dx) > Math.abs(dy) * COMMIT_RATIO) {
        committed.current = true;
      } else {
        return;  // no es gesto horizontal → deja pasar el scroll
      }
    }
    // Ya comprometidos: clamp para que la tarjeta no se vaya más allá del máximo
    const clamped = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, dx));
    setOffset(clamped);
  }

  function onEnd() {
    if (startX.current === null) return;
    const finalOffset = offset;
    startX.current = null;
    startY.current = null;
    if (!committed.current) {
      // nunca llegamos a comprometernos → era scroll vertical, no hacemos nada
      setOffset(0);
      return;
    }
    committed.current = false;
    if (finalOffset > SWIPE_THRESHOLD && onDelete) {
      // swipe derecha: borramos
      setOffset(SWIPE_MAX);  // animación hacia afuera
      setFired("delete");
      // Llamamos al delete y luego reseteamos
      onDelete();
      setTimeout(() => { setOffset(0); setFired(null); }, 350);
    } else if (finalOffset < -SWIPE_THRESHOLD && onEdit) {
      // swipe izquierda: editamos
      setOffset(-SWIPE_MAX);
      setFired("edit");
      onEdit();
      setTimeout(() => { setOffset(0); setFired(null); }, 350);
    } else {
      // vuelve a posición original
      setOffset(0);
    }
  }

  // Icono + fondo que aparece detrás de la tarjeta cuando se desliza.
  // Si deltaX > 0 (derecha): fondo rojo + trash a la izquierda
  // Si deltaX < 0 (izquierda): fondo azul + pencil a la derecha
  const reveal = offset > 0 ? (
    <div
      className="absolute inset-0 flex items-center justify-start pl-4 text-white"
      style={{ background: "#c3423f" }}
    >
      <Trash2 size={20} aria-hidden />
      <span className="ml-2 font-semibold text-sm">Eliminar</span>
    </div>
  ) : offset < 0 ? (
    <div
      className="absolute inset-0 flex items-center justify-end pr-4 text-white"
      style={{ background: "#3b82f6" }}
    >
      <span className="mr-2 font-semibold text-sm">Editar</span>
      <Pencil size={20} aria-hidden />
    </div>
  ) : null;

  return (
    <div className="relative overflow-hidden rounded-xl" style={{ borderRadius: 8 }}>
      {reveal}
      <div
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        onMouseDown={onStart}
        onMouseMove={(e) => { if (startX.current !== null) onMove(e); }}
        onMouseUp={onEnd}
        onMouseLeave={() => { if (startX.current !== null) onEnd(); }}
        style={{
          transform: `translateX(${offset}px)`,
          transition: committed.current ? "none" : "transform 250ms ease",
          touchAction: "pan-y",
          background: "var(--bg-card, var(--bg-primary))",
          borderRadius: "inherit",
        }}
      >
        {children}
      </div>
    </div>
  );
}