"use client";

// Controlador genérico de un wizard. Maneja:
//   · estado del paso actual
//   · errores por paso (validación local)
//   · navegación con teclado (Enter avanza salvo dentro de textarea)
//   · re-intento de validación y foco al primer campo con error
//   · botón "Cancelar" en el primer paso, "Atrás" en los siguientes
//   · paso de resumen (muestra summary card en lugar de inputs)
//   · opcional `<SuccessScreen>` al terminar

import { useCallback, useEffect, useState } from "react";
import WizardLayout from "./WizardLayout";
import SuccessScreen from "./SuccessScreen";
import AppButton from "./AppButton";

/** Función de validación por paso. Devuelve un mapa campo → mensaje. */
export type StepValidator<V> = (values: V) => Partial<Record<string, string>>;

/** Resultado de validar: OK o { field, message }. */
export interface ValidationResult {
  field: string;
  message: string;
}

export interface WizardStep<V> {
  /** ID estable, útil para tests y re-edición desde el resumen. */
  id: string;
  /** Título que aparece bajo el progress (h1). */
  title: string;
  /** Subtítulo opcional. */
  subtitle?: React.ReactNode;
  /** Campos a validar (claves de V). Vacío = el paso siempre es válido. */
  fields?: Array<keyof V>;
  /** Validación opcional; si no se da, no se valida (paso siempre OK). */
  validate?: StepValidator<V>;
  /** Render del contenido del paso. */
  render: (
    values: V,
    setField: <K extends keyof V>(key: K, val: V[K]) => void,
    errors: WizardErrors,
  ) => React.ReactNode;
  /** Cuando true, el paso es de resumen (no editable, pero permite editar atrás). */
  isSummary?: boolean;
}

export interface WizardErrors {
  [field: string]: string;
}

export interface WizardSuccess<V> {
  /** Título del SuccessScreen (default "¡Perfecto!"). */
  title?: string;
  /** Subtítulo (ej. "Gasto guardado correctamente"). */
  subtitle?: React.ReactNode;
  /** Cifra destacada (ej. "53,00 €"). */
  highlight?: React.ReactNode;
  /** Detalle secundario (ej. "Lavado + aspirado · 31/07/2026"). */
  detail?: React.ReactNode;
  /** Acción primaria (ej. "Ver en actividad"). */
  primary: { label: string; onClick?: () => void; href?: string };
  /** Acción secundaria opcional (ej. "Añadir otro gasto"). */
  secondary?: { label: string; onClick?: () => void; href?: string };
  /** Si true, el éxito se muestra tras `onSubmit`. */
  show: boolean;
}

export interface WizardProps<V> {
  steps: WizardStep<V>[];
  values: V;
  onChange: (next: V) => void;
  /** Etiqueta del botón "Next" / "Siguiente". */
  nextLabel?: string;
  /** Etiqueta del botón final "Save" / "Guardar". */
  submitLabel?: string;
  /** Etiqueta del botón "Cancel" / "Cancelar" (solo paso 1). */
  cancelLabel?: string;
  /** Etiqueta del botón "Back" / "Atrás". */
  backLabel?: string;
  /** Loading del último paso al guardar. */
  submitting?: boolean;
  /** Se invoca al pulsar "Guardar". `true` si todo fue bien. */
  onSubmit: () => Promise<boolean> | boolean;
  /** Acción al cerrar (X o cancelar). */
  onClose: () => void;
  /** Confirmación al cerrar si hay cambios. Default: true. */
  /** Estado y contenido del SuccessScreen; se proyecta al terminar. */
  success?: WizardSuccess<V>;
  /** Wrapper opcional para el contenedor. */
  className?: string;
}

export default function Wizard<V extends object>({
  steps,
  values,
  onChange,
  nextLabel = "Siguiente",
  submitLabel = "Guardar",
  cancelLabel = "Cancelar",
  backLabel = "Atrás",
  submitting = false,
  onSubmit,
  onClose,
  success,
  className,
}: WizardProps<V>) {
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<WizardErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const totalSteps = steps.length;

  const setField = useCallback(<K extends keyof V>(key: K, val: V[K]) => {
    onChange({ ...values, [key]: val });
    // Limpia el error de ese campo en cuanto el usuario escribe.
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
    setTouched((prev) => new Set(prev).add(key as string));
  }, [values, onChange]);

  function validateCurrent(): ValidationResult | null {
    if (!step.validate) return null;
    const v = step.validate(values);
    const firstField = step.fields?.[0] as string | undefined;
    const firstError = Object.values(v)[0];
    if (firstError && firstField) {
      return { field: firstField, message: firstError };
    }
    return null;
  }

  function focusFirstError() {
    // El primer elemento con aria-invalid="true" recibe el foco. AppInput,
    // AppSelect y AppDatePicker ya lo exponen cuando reciben `error`, así
    // que cualquier consumidor del Wizard se beneficia sin pegarse a una
    // prop nueva.
    if (typeof document === "undefined") return;
    const el = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    el?.focus({ preventScroll: false });
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleNext() {
    const err = validateCurrent();
    if (err) {
      setErrors((prev) => ({ ...prev, [err.field]: err.message }));
      // Marcar todos los fields del step como tocados para que se vean.
      setTouched((prev) => {
        const next = new Set(prev);
        (step.fields ?? []).forEach((f) => next.add(f as string));
        return next;
      });
      // Pequeño delay para que React pinte el aria-invalid antes de focus.
      setTimeout(focusFirstError, 0);
      return;
    }
    setErrors({});
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function handleBack() {
    setErrors({});
    setStepIndex((i) => Math.max(0, i - 1));
  }

  async function handleSubmit() {
    // Valida todos los pasos antes de enviar.
    for (const s of steps) {
      if (!s.validate) continue;
      const v = s.validate(values);
      if (Object.keys(v).length > 0) {
        setErrors(v as WizardErrors);
        setTouched((prev) => {
          const next = new Set(prev);
          (s.fields ?? []).forEach((f) => next.add(f as string));
          return next;
        });
        const idx = steps.findIndex((x) => x.id === s.id);
        if (idx >= 0) setStepIndex(idx);
        setTimeout(focusFirstError, 0);
        return;
      }
    }
    await onSubmit();
  }

  // Atajo de teclado: Enter fuera de textareas avanza.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" || (e.target as HTMLElement | null)?.tagName === "TEXTAREA") return;
      if ((e.target as HTMLElement | null)?.getAttribute("role") === "button") return;
      if (success?.show) return;
      e.preventDefault();
      if (isLast) handleSubmit();
      else handleNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLast, stepIndex, values, success?.show]);

  // Si el éxito está activo, renderizamos el SuccessScreen a pantalla
  // completa en lugar del layout.
  if (success?.show) {
    return (
      <SuccessScreen
        title={success.title}
        subtitle={success.subtitle}
        highlight={success.highlight}
        detail={success.detail}
        primaryAction={success.primary}
        secondaryAction={success.secondary}
        className={className}
      />
    );
  }

  // Footer: dos botones lado a lado. Cancelar solo en el primer paso.
  const footer = (
    <>
      {isFirst ? (
        <AppButton
          variant="secondary"
          size="lg"
          onClick={onClose}
          className="flex-1"
        >
          {cancelLabel}
        </AppButton>
      ) : (
        <AppButton
          variant="secondary"
          size="lg"
          onClick={handleBack}
          className="flex-1"
        >
          {backLabel}
        </AppButton>
      )}
      <AppButton
        size="lg"
        onClick={isLast ? handleSubmit : handleNext}
        loading={submitting && isLast}
        disabled={submitting && isLast}
        className="flex-1"
      >
        {isLast ? submitLabel : nextLabel}
      </AppButton>
    </>
  );

  return (
    <WizardLayout
      title={step.title}
      currentStep={stepIndex + 1}
      totalSteps={totalSteps}
      onBack={isFirst ? undefined : handleBack}
      onClose={onClose}
      footer={footer}
      className={className}
    >
      {step.subtitle && (
        <p className="text-body text-text-secondary">{step.subtitle}</p>
      )}
      {step.render(values, setField, errors)}
    </WizardLayout>
  );
}
