"use client";

import { useRef, useState } from "react";

export interface Toast {
  msg: string;
  type: "success" | "error";
  undo?: () => void;
}

// Extraído de CarDetailClient (Ticket: reducir el "god component"). Sistema
// de toasts genérico + soporte de "Deshacer": showUndoToast guarda la
// función de restauración durante 5s antes de descartar el toast.
export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success", ms = 2500) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), ms);
  };

  const showUndoToast = (msg: string, restore: () => Promise<void>) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setToast({
      msg,
      type: "success",
      undo: async () => {
        await restore();
        setToast({ msg: "Restaurado", type: "success" });
        setTimeout(() => setToast(null), 1800);
      },
    });
    undoTimer.current = setTimeout(() => setToast(null), 5000);
  };

  return { toast, setToast, showToast, showUndoToast, undoTimer };
}
