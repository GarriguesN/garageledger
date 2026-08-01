"use client";

// Los dos botones del pie: secundario a la izquierda (Cancelar en el primer
// paso, Atrás en el resto) y primario a la derecha (Siguiente, o el guardado
// en el último). Mismo ancho los dos, para que el pulgar no tenga que
// apuntar.

import AppButton from "@/components/ui/AppButton";

export interface StepNavigationProps {
  backLabel: string;
  nextLabel: string;
  onBack: () => void;
  onNext: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function StepNavigation({
  backLabel, nextLabel, onBack, onNext, loading = false, disabled = false,
}: StepNavigationProps) {
  return (
    <div className="flex gap-3">
      <AppButton variant="secondary" size="lg" onClick={onBack} disabled={loading}>
        {backLabel}
      </AppButton>
      <AppButton size="lg" onClick={onNext} loading={loading} disabled={disabled || loading}>
        {nextLabel}
      </AppButton>
    </div>
  );
}
