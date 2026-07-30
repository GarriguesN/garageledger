"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AlertTarget } from "../components/AlertBanner";
import type { ToastFn } from "../lib/net";

// Extraído de CarDetailClient (Ticket: reducir el "god component").
// Ticket 1.6: mapa taskId → HTMLElement de la fila correspondiente, para
// poder hacer scroll + highlight cuando el usuario pulsa una alerta de
// mantenimiento. MaintenanceSchedule llama a `registerTaskRef(task.id, el)`
// en cada render y con `el=null` al desmontar.

interface UseAlertScrollArgs {
  carId: number;
  setToast: ToastFn;
}

export function useAlertScroll({ carId, setToast }: UseAlertScrollArgs) {
  const taskRefs = useRef<Map<number, HTMLElement>>(new Map());
  const [flashTaskId, setFlashTaskId] = useState<number | null>(null);
  const router = useRouter();

  const registerTaskRef = (taskId: number, el: HTMLElement | null) => {
    if (el) taskRefs.current.set(taskId, el);
    else taskRefs.current.delete(taskId);
  };

  // Click en una alerta: ITV/Seguro abre el editor del coche en la ruta
  // dedicada. Mantenimiento hace scroll a la fila + highlight breve.
  const handleAlertClick = (target: AlertTarget) => {
    if (target === "edit-itv" || target === "edit-seguro") {
      router.push(`/coches/${carId}/editar`);
      return;
    }
    // scroll-maintenance
    const el = taskRefs.current.get(target.taskId);
    if (!el) {
      // La tarea referenciada por el task_id no está renderizada (caso
      // raro: alert stale de BD, race con completeTask). Avisamos al
      // usuario en vez de hacer scroll a un destino incorrecto.
      setToast({
        msg: "La tarea ya no está en la lista. Recarga la página.",
        type: "error",
      });
      return;
    }
    setFlashTaskId(target.taskId);
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    // Quitamos el flag después de la animación (1.5s en CSS + margen).
    setTimeout(() => {
      setFlashTaskId((current) => (current === target.taskId ? null : current));
    }, 1700);
  };

  return { registerTaskRef, flashTaskId, handleAlertClick };
}
