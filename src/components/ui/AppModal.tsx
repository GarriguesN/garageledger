"use client";

// Sheet a pantalla completa (mockups 3 y 4). Reemplaza al Modal antiguo.
//
// Detalles que no se ven pero se notan:
//   · bloquea el scroll del fondo mientras está abierto,
//   · cierra con Escape,
//   · atrapa el foco dentro del diálogo (Tab no se escapa al fondo),
//   · devuelve el foco al elemento que lo abrió al cerrarse.

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowLeft } from "@/design/tokens/icons";
import { iconSize, strokeWidth, duration, easing } from "@/design/tokens";
import { cn } from "./cn";

export interface AppModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Muestra ← a la izquierda (paso 2 del asistente vuelve al paso 1). */
  onBack?: () => void;
  children: React.ReactNode;
  /** Barra fija al pie: el botón "Guardar" del mockup 4. */
  footer?: React.ReactNode;
  className?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function AppModal({
  open,
  onClose,
  title,
  onBack,
  children,
  footer,
  className,
}: AppModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    // El primer campo recibe el foco para poder escribir sin tocar la pantalla.
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 50);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
      document.body.style.overflow = overflow;
      restoreFocusTo.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration.press }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : undefined}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: duration.page, ease: easing.out }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "modal-panel flex w-full max-w-2xl flex-col bg-surface shadow-floating sm:rounded-card",
              className,
            )}
          >
            <header className="safe-top flex min-h-14 shrink-0 items-center gap-1 border-b border-border px-2">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Atrás"
                  className="inline-flex size-11 items-center justify-center text-text"
                >
                  <ArrowLeft size={iconSize.lg} strokeWidth={strokeWidth.default} />
                </button>
              ) : (
                <span className="w-2" />
              )}
              <h2 className={cn("min-w-0 flex-1 truncate text-title font-bold text-text", onBack && "text-center")}>
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="inline-flex size-11 items-center justify-center text-text"
              >
                <X size={iconSize.lg} strokeWidth={strokeWidth.default} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>

            {footer && (
              <div className="safe-bottom shrink-0 border-t border-border px-4 py-3">{footer}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
