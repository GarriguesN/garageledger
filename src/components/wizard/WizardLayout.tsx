"use client";

// Armazón de cualquier asistente: cabecera, progreso, área de contenido con
// scroll y pie fijo. Es el único sitio donde se decide esa geometría, así que
// todos los asistentes se comportan igual sin ponerse de acuerdo.
//
// Dos presentaciones, mismo interior:
//
//   sheet  sobre la pantalla actual (gasto, documento, completar tarea). El
//          estado a medias no debería sobrevivir a un refresco, así que no
//          es una ruta.
//   page   contenido de una ruta propia (alta y edición de vehículo,
//          programar mantenimiento): son flujos largos a los que se llega
//          desde un enlace y que conviene poder compartir/recargar.
//
// Detalles que no se ven pero se notan (solo en `sheet`, donde hay fondo del
// que aislarse): bloquea el scroll de detrás, cierra con Escape y atrapa el
// foco dentro del diálogo.
//
// El teclado del móvil: el panel mide 100dvh, que encoge cuando el teclado
// sube, así que el pie sigue visible; y al enfocar un campo se le hace
// scroll al centro para que no quede tapado.

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { duration, easing } from "@/design/tokens";
import { cn } from "@/components/ui/cn";
import WizardHeader from "./WizardHeader";
import WizardProgress from "./WizardProgress";
import WizardFooter from "./WizardFooter";

export interface WizardLayoutProps {
  mode?: "sheet" | "page";
  /** Solo en modo sheet. */
  open?: boolean;
  /** Solo en modo page: la pantalla vive dentro del marco del vehículo, que
   *  tiene barra inferior fija. El pie del asistente se sube por encima de
   *  ella en vez de quedar debajo. */
  hasBottomNav?: boolean;
  title: string;
  /** Paso actual (base 1) y total visible. Sin ellos no se pinta progreso
   *  —el estado de éxito, por ejemplo, ya no está en ningún paso. */
  current?: number;
  total?: number;
  onBack?: () => void;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function WizardLayout({
  mode = "sheet", open = true, hasBottomNav = false, title, current, total,
  onBack, onClose, footer, children,
}: WizardLayoutProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  // Campo enfocado siempre a la vista. Sin esto, en un móvil con teclado
  // abierto el campo de la mitad inferior queda debajo del teclado y el
  // usuario escribe a ciegas.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    function onFocusIn(e: FocusEvent) {
      const el = e.target as HTMLElement | null;
      if (!el || !el.matches("input, select, textarea")) return;
      // Se espera al siguiente frame: en móvil el teclado aún está
      // apareciendo y el scroll calculado antes sale corto.
      window.setTimeout(() => {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 150);
    }
    node.addEventListener("focusin", onFocusIn);
    return () => node.removeEventListener("focusin", onFocusIn);
  }, []);

  // El contenido vuelve arriba al cambiar de paso: entrar en un paso nuevo
  // por su mitad es desorientador.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [current]);

  useEffect(() => {
    if (mode !== "sheet" || !open) return;

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
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      restoreFocusTo.current?.focus?.();
    };
  }, [mode, open, onClose]);

  const chrome = (
    <>
      <WizardHeader title={title} onBack={onBack} onClose={onClose} />
      {current != null && total != null && <WizardProgress current={current} total={total} />}
    </>
  );

  // En modo página el scroll es el del documento y el pie va pegajoso: así
  // la pantalla convive con la barra inferior del vehículo, que es fija.
  if (mode === "page") {
    return (
      <div className={cn("safe-x flex min-h-dvh w-full flex-col bg-background", hasBottomNav && "pb-nav")}>
        <div className="sticky top-0 z-10 bg-background">{chrome}</div>
        <div ref={scrollRef} className="mx-auto w-full max-w-2xl flex-1 px-4 pb-6 pt-2">
          {children}
        </div>
        {footer && (
          <WizardFooter className={cn("sticky", hasBottomNav ? "bottom-nav-offset" : "bottom-0")}>
            {footer}
          </WizardFooter>
        )}
      </div>
    );
  }

  const inner = (
    <>
      {chrome}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 pb-6 pt-2">{children}</div>
      </div>
      {footer && <WizardFooter>{footer}</WizardFooter>}
    </>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration.press }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center"
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: duration.page, ease: easing.out }}
            className={cn(
              "modal-panel flex w-full max-w-2xl flex-col bg-surface shadow-floating sm:rounded-card",
            )}
          >
            {inner}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
