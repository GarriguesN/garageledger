"use client";

// Editar y borrar un gasto.
//
// Editar reutiliza el mismo asistente que lo creó —los mismos pasos y las
// mismas validaciones— en vez de un formulario aparte que acabaría
// divergiendo. Borrar pide confirmación porque no hay papelera: un gasto
// borrado no vuelve.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppButton, AppModal, AppToast } from "@/components/ui";
import { useToast } from "@/components/ui/AppToast";
import ExpenseWizard from "@/components/wizards/ExpenseWizard";

export interface ExpenseActionsProps {
  carId: number;
  currentKm: number;
  expense: {
    id: number;
    tipoId: string;
    importe: number;
    litros: number | null;
    km: number | null;
    referencia: string;
    descripcion: string;
    metodoPago: string | null;
    date: string;
  };
}

export default function ExpenseActions({ carId, currentKm, expense }: ExpenseActionsProps) {
  const router = useRouter();
  const { toast, show, dismiss } = useToast();
  const [editing, setEditing] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/expenses?id=${expense.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setConfirming(false);
      // replace, no push: el gasto ya no existe y volver atrás a su ficha
      // sería volver a un 404.
      router.replace(`/coches/${carId}/gastos`);
      router.refresh();
    } catch {
      show("No se pudo eliminar el gasto", "error");
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex gap-3">
        <AppButton
          variant="secondary"
          size="lg"
          icon="edit"
          onClick={() => {
            setEditKey((k) => k + 1);
            setEditing(true);
          }}
        >
          Editar
        </AppButton>
        <AppButton variant="danger" size="lg" icon="delete" onClick={() => setConfirming(true)}>
          Eliminar
        </AppButton>
      </div>

      <ExpenseWizard
        key={editKey}
        open={editing}
        onClose={() => setEditing(false)}
        carId={carId}
        currentKm={currentKm}
        stations={expense.referencia ? [expense.referencia] : []}
        expense={expense}
      />

      <AppModal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Eliminar gasto"
        footer={
          <div className="flex gap-3">
            <AppButton variant="secondary" size="lg" onClick={() => setConfirming(false)}>
              Cancelar
            </AppButton>
            <AppButton variant="danger" size="lg" onClick={remove} loading={deleting}>
              Eliminar
            </AppButton>
          </div>
        }
      >
        <p className="text-body text-text-secondary">
          Este gasto se borrará del historial y dejará de contar en los totales. No se puede
          deshacer.
        </p>
      </AppModal>

      <AppToast toast={toast} onDismiss={dismiss} />
    </>
  );
}
