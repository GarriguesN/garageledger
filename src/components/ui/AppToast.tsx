"use client";

// Aviso efímero tras una acción. Se anuncia con role="status" para que un
// lector de pantalla lo lea sin robar el foco.

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { colors, duration, easing, radius } from "@/design/tokens";

export interface ToastState {
  message: string;
  tone?: "success" | "error";
  /** Acción de deshacer. Mientras exista, el aviso no se cierra solo tan rápido. */
  onUndo?: () => void;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((message: string, tone: "success" | "error" = "success") => {
    setToast({ message, tone });
  }, []);

  const showUndo = useCallback((message: string, onUndo: () => void) => {
    setToast({ message, tone: "success", onUndo });
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  return { toast, show, showUndo, dismiss };
}

export default function AppToast({
  toast,
  onDismiss,
}: {
  toast: ToastState | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    // Con "deshacer" se da más margen: leer el mensaje y decidir lleva más
    // que enterarse de que algo salió bien.
    const ms = toast.onUndo ? 6000 : 3000;
    const t = window.setTimeout(onDismiss, ms);
    return () => window.clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: duration.page, ease: easing.out }}
          className="safe-bottom fixed inset-x-0 bottom-20 z-50 mx-auto flex w-fit max-w-full items-center gap-4 px-4"
        >
          <span
            className="flex items-center gap-4 px-4 py-3 shadow-floating"
            style={{
              borderRadius: radius.button,
              backgroundColor: colors.surfaceElevated,
              border: `1px solid ${toast.tone === "error" ? colors.danger : colors.border}`,
            }}
          >
            <span className="text-body text-text">{toast.message}</span>
            {toast.onUndo && (
              <button
                type="button"
                onClick={() => {
                  toast.onUndo?.();
                  onDismiss();
                }}
                className="shrink-0 text-body font-semibold text-primary"
              >
                Deshacer
              </button>
            )}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
