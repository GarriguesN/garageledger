"use client";

// Modal genérico reutilizable por toda la app.
//
// Patrón visual: bottom sheet en móvil, modal centrado en escritorio. Fondo
// oscuro semitransparente detrás. Cierre por X / Escape / click en backdrop.
// A11y: role="dialog" + aria-modal + focus trap manual (Tab/Shift+Tab cíclico)
// + return focus al elemento que tenía foco al abrir + aria-hidden al
// contenido de fuera (en vez de inert, que no tiene soporte amplio todavía).

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  totalCount?: number;
  /** texto que se muestra a la derecha del título, ej. "8 elementos". */
  countLabel?: string;
  children: ReactNode;
  /** clases para el contenido interior (padding, ancho máximo). */
  className?: string;
  /** id del contenedor principal de la página. Cuando el modal está
   *  abierto se le aplica aria-hidden="true" + role="presentation". */
  mainId?: string;
}

// Selectores estándar de elementos focuseables para el focus trap.
const FOCUSABLE = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export default function Modal({
  open,
  onClose,
  title,
  totalCount,
  countLabel,
  children,
  className = "",
  mainId,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // 1) Bloquear scroll del body mientras el modal está abierto.
  // 2) Guardar elemento con foco previo para devolverlo al cerrar.
  // 3) Poner foco en el primer focuseable del modal al abrir.
  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    // Pone foco en el primer focuseable o en el propio diálogo.
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusables = dialog.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = focusables[0];
    requestAnimationFrame(() => {
      if (first) first.focus();
      else dialog.focus();
    });

    return () => {
      document.body.style.overflow = "";
      // Devolver foco al elemento previo (Ticket 1.18: accesibilidad).
      const prev = prevFocusRef.current;
      if (prev && document.body.contains(prev)) {
        try { prev.focus(); } catch { /* ignore */ }
      }
      prevFocusRef.current = null;
    };
  }, [open]);

  // Focus trap: Tab / Shift+Tab cíclico dentro del modal.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // aria-hidden al contenido de fuera mientras el modal está abierto.
  // No usamos `inert` porque los Modales se renderizan dentro de #page-main,
  // y `inert` en el ancestro bloquearía la interactividad del propio modal.
  useEffect(() => {
    if (!open) return;
    const targets: Element[] = [];
    if (mainId) {
      const m = document.getElementById(mainId);
      if (m) targets.push(m);
    }
    document
      .querySelectorAll<HTMLElement>('nav, header[role="banner"]')
      .forEach((n) => targets.push(n));

    const prev: Array<{ el: Element; aria: string | null }> = [];
    for (const el of targets) {
      prev.push({ el, aria: el.getAttribute("aria-hidden") });
      el.setAttribute("aria-hidden", "true");
    }

    return () => {
      for (const { el, aria } of prev) {
        if (aria === null) el.removeAttribute("aria-hidden");
        else el.setAttribute("aria-hidden", aria);
      }
    };
  }, [open, mainId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0"
      style={{ marginBottom: 0 }}
      onMouseDown={(e) => {
        // Click en el backdrop (no en el contenido) cierra.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`bg-[var(--bg-primary)] w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl flex flex-col max-h-[90vh] shadow-xl outline-none ${className}`}
      >
        {/* Cabecera */}
        {(title || totalCount !== undefined) && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--border-color)] flex-shrink-0">
            <h2 className="font-semibold text-base flex items-center gap-2">
              {title}
              {totalCount !== undefined && (
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  {totalCount}{countLabel ? ` ${countLabel}` : ""}
                </span>
              )}
            </h2>
            <button
              type="button"
              aria-label="Cerrar"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        )}
        {/* Cuerpo */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pt-4 pb-8">
          {children}
        </div>
      </div>
    </div>
  );
}
