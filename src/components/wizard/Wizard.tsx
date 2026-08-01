"use client";

// Motor de los asistentes. Toda la mecánica común vive aquí y solo aquí:
//
//   · un único objeto de valores para todo el asistente — volver atrás no
//     puede perder nada porque los pasos leen y escriben el mismo estado;
//   · validación por paso, al pulsar "Siguiente" — nunca al final, cuando
//     ya no se sabe qué campo de qué pantalla estaba mal;
//   · el primer campo inválido recibe el foco y se le hace scroll;
//   · pasos condicionales (`when`) que no cuentan en el progreso;
//   · confirmación al cerrar solo si se ha escrito algo;
//   · estado de éxito compartido al guardar.
//
// Una pantalla nueva declara pasos y una función de guardado. Si algo de lo
// de arriba hay que escribirlo otra vez en una pantalla, es que falta aquí.

import { useCallback, useMemo, useRef, useState } from "react";
import AppButton from "@/components/ui/AppButton";
import WizardLayout from "./WizardLayout";
import WizardStep from "./WizardStep";
import StepNavigation from "./StepNavigation";
import SuccessState from "./SuccessState";
import type { WizardStepDef, WizardStepContext, WizardText } from "./types";

/** Resuelve un texto que puede depender de los valores. */
function text<T>(value: WizardText<T> | undefined, values: T): string | undefined {
  return typeof value === "function" ? (value as (v: T) => string)(values) : value;
}

/** Lo que se enseña al terminar. Lo devuelve `onSubmit`, que es quien sabe
 *  qué se acaba de guardar. */
export interface WizardSuccess {
  title?: string;
  message: string;
  headline?: React.ReactNode;
  detail?: React.ReactNode;
  meta?: React.ReactNode;
  primaryLabel: string;
  /** Por defecto, cerrar el asistente. */
  onPrimary?: () => void;
  secondaryLabel?: string;
  /** Por defecto, empezar otro con los valores iniciales. */
  onSecondary?: () => void;
}

export interface WizardProps<T extends object> {
  mode?: "sheet" | "page";
  /** Solo en modo sheet. */
  open?: boolean;
  /** Solo en modo página: hay barra inferior fija bajo el asistente. */
  hasBottomNav?: boolean;
  /** Título de la cabecera. Puede depender de lo elegido: el asistente de
   *  gasto se llama "Añadir combustible" cuando esa es la categoría. */
  title: WizardText<T>;
  steps: WizardStepDef<T>[];
  initialValues: T;
  /** Paso por el que empezar (accesos rápidos que se saltan la elección
   *  de tipo). */
  initialStepId?: string;
  /** Etiqueta del botón del último paso. */
  submitLabel?: string;
  /** Guarda. Lo que devuelva se pinta como estado de éxito; si no devuelve
   *  nada, el asistente se cierra. Lanzar un Error enseña su mensaje. */
  onSubmit: (values: T) => Promise<WizardSuccess | void>;
  onClose: () => void;
}

export default function Wizard<T extends object>({
  mode = "sheet",
  open = true,
  hasBottomNav = false,
  title,
  steps,
  initialValues,
  initialStepId,
  submitLabel = "Guardar",
  onSubmit,
  onClose,
}: WizardProps<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // El paso inicial se resuelve una vez, con los pasos que existen para los
  // valores de partida: los accesos rápidos ("añadir combustible") entran
  // directamente en su paso en vez de por la rejilla de tipos.
  const [index, setIndex] = useState(() => {
    if (!initialStepId) return 0;
    const at = steps
      .filter((s) => (s.when ? s.when(initialValues) : true))
      .findIndex((s) => s.id === initialStepId);
    return at > 0 ? at : 0;
  });
  const [direction, setDirection] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [success, setSuccess] = useState<WizardSuccess | null>(null);

  // Nodos de los campos, para poder enfocar el primero que falle.
  const fields = useRef<Record<string, HTMLElement | null>>({});

  // Los pasos que ahora mismo existen. El asistente de gasto cambia de rama
  // (combustible o genérico) según el tipo elegido, así que esto se recalcula
  // con los valores.
  const visible = useMemo(
    () => steps.filter((s) => (s.when ? s.when(values) : true)),
    [steps, values],
  );

  const clamped = Math.min(index, Math.max(visible.length - 1, 0));
  const step = visible[clamped];
  const isLast = clamped === visible.length - 1;

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setErrors((e) => {
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  }, []);

  const patch = useCallback((next: Partial<T>) => {
    setValues((v) => ({ ...v, ...next }));
    setDirty(true);
    setErrors({});
  }, []);

  /** Elegir una casilla ya es la decisión del paso: se aplica y se avanza.
   *  Los pasos visibles se recalculan aquí con los valores YA mezclados
   *  porque la elección puede cambiar la rama (elegir combustible cambia los
   *  pasos que vienen después). */
  function pick(next: Partial<T>) {
    const merged = { ...values, ...next };
    const after = steps.filter((s) => (s.when ? s.when(merged) : true));
    const at = after.findIndex((s) => s.id === step?.id);
    setValues(merged);
    setDirty(true);
    setErrors({});
    setDirection(1);
    setIndex(Math.min(at + 1, after.length - 1));
  }

  const fieldRef = useCallback(
    (name: string) => (el: HTMLElement | null) => {
      fields.current[name] = el;
    },
    [],
  );

  const goTo = useCallback(
    (stepId: string) => {
      const at = visible.findIndex((s) => s.id === stepId);
      if (at < 0) return;
      setDirection(at > clamped ? 1 : -1);
      setErrors({});
      setIndex(at);
    },
    [visible, clamped],
  );

  /** Errores reales de un paso: sin las claves que la validación dejó en
   *  undefined. */
  function errorsOf(def: WizardStepDef<T>): Record<string, string> {
    const found = def.validate?.(values) ?? {};
    return Object.fromEntries(
      Object.entries(found).filter(([, message]) => !!message),
    ) as Record<string, string>;
  }

  /** Valida un paso y, si falla, enfoca su primer campo con error. */
  function check(def: WizardStepDef<T>): boolean {
    const found = errorsOf(def);
    const keys = Object.keys(found);
    if (keys.length === 0) {
      setErrors({});
      return true;
    }
    setErrors(found);
    const target = keys.map((k) => fields.current[k]).find(Boolean);
    if (target) {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      target.focus?.();
    }
    return false;
  }

  function goNext() {
    if (!step) return;
    if (!check(step)) return;
    if (!isLast) {
      setDirection(1);
      setIndex(clamped + 1);
      return;
    }
    void save();
  }

  function goBack() {
    if (clamped === 0) {
      requestClose();
      return;
    }
    setDirection(-1);
    setErrors({});
    setIndex(clamped - 1);
  }

  async function save() {
    // Repaso completo antes de escribir: un paso anterior pudo quedarse
    // inválido si un cambio posterior lo invalidó (cambiar de categoría, por
    // ejemplo). Se salta al primero que falle en vez de guardar a medias.
    for (let i = 0; i < visible.length; i++) {
      const found = errorsOf(visible[i]);
      if (Object.keys(found).length > 0) {
        setDirection(i > clamped ? 1 : -1);
        setIndex(i);
        setErrors(found);
        return;
      }
    }

    setSaving(true);
    setErrors({});
    try {
      const result = await onSubmit(values);
      if (result) setSuccess(result);
      else onClose();
    } catch (e) {
      setErrors({ _form: e instanceof Error ? e.message : "No se ha podido guardar" });
    } finally {
      setSaving(false);
    }
  }

  function requestClose() {
    if (dirty && !success) {
      setConfirmClose(true);
      return;
    }
    onClose();
  }

  /** Descartar cierra las DOS cosas: la confirmación y el asistente. El
   *  aviso es estado propio de este componente, y quien cierra el asistente
   *  es el padre (baja `open`), así que olvidarse de bajar el aviso dejaba un
   *  panel colgado que había que cerrar a mano. */
  function discard() {
    setConfirmClose(false);
    onClose();
  }

  function restart() {
    setValues(initialValues);
    setErrors({});
    setIndex(0);
    setDirection(1);
    setDirty(false);
    setSuccess(null);
  }

  // Validación en vivo del paso actual. Sirve para dos cosas:
  //
  //   · el botón primario está apagado mientras falte algo — no se puede
  //     avanzar a un paso siguiente para descubrir allí que el anterior
  //     estaba mal;
  //   · lo escrito y mal se marca en rojo al momento, sin esperar a pulsar.
  //
  // Un campo obligatorio todavía VACÍO no se pinta en rojo: no se regaña a
  // nadie por no haber llegado aún. Que el botón siga apagado ya dice que
  // falta algo.
  const liveErrors = step ? errorsOf(step) : {};
  const stepComplete = Object.keys(liveErrors).length === 0;

  const shownErrors: Record<string, string> = { ...errors };
  for (const [field, message] of Object.entries(liveErrors)) {
    const value = (values as Record<string, unknown>)[field];
    const empty = value == null || value === "" || value === false;
    if (!empty) shownErrors[field] = message;
  }

  const ctx: WizardStepContext<T> = {
    values, set, patch, pick, errors: shownErrors, goTo, fieldRef,
  };
  const heading = text(title, values)!;

  // ── Estado de éxito ─────────────────────────────────────────────
  if (success) {
    return (
      <WizardLayout mode={mode} open={open} hasBottomNav={hasBottomNav} title={heading} onClose={onClose}>
        <SuccessState
          title={success.title}
          message={success.message}
          headline={success.headline}
          detail={success.detail}
          meta={success.meta}
          primaryLabel={success.primaryLabel}
          onPrimary={success.onPrimary ?? onClose}
          secondaryLabel={success.secondaryLabel}
          onSecondary={success.secondaryLabel ? success.onSecondary ?? restart : undefined}
        />
      </WizardLayout>
    );
  }

  return (
    <>
      <WizardLayout
        mode={mode}
        open={open}
        hasBottomNav={hasBottomNav}
        title={heading}
        current={clamped + 1}
        total={visible.length}
        onBack={clamped > 0 ? goBack : undefined}
        onClose={requestClose}
        footer={
          <div className="space-y-3">
            {errors._form && (
              <p role="alert" className="text-caption text-danger">
                {errors._form}
              </p>
            )}
            <StepNavigation
              backLabel={clamped === 0 ? "Cancelar" : "Atrás"}
              nextLabel={
                text(step?.nextLabel, values) ?? (isLast ? submitLabel : "Siguiente")
              }
              onBack={goBack}
              onNext={goNext}
              loading={saving}
              disabled={!stepComplete}
            />
          </div>
        }
      >
        {/* El paso se remonta al cambiar de id (key), y con él se dispara su
            animación de entrada. Sin AnimatePresence a propósito: el paso
            saliente no aporta nada y esperar a que termine su salida retrasa
            el que el usuario quiere ver. */}
        {step && (
          <WizardStep
            key={step.id}
            title={text(step.title, values)!}
            subtitle={text(step.subtitle, values)}
            direction={direction}
          >
            {step.render(ctx)}
          </WizardStep>
        )}
      </WizardLayout>

      {/* Ligado también a `open`: si el asistente se cierra por otra vía
          mientras el aviso está en pantalla, el aviso se va con él. */}
      {confirmClose && open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="wizard-discard-title"
            className="w-full max-w-2xl rounded-card border border-border bg-surface p-6 shadow-floating"
          >
            <h3 id="wizard-discard-title" className="text-title font-bold text-text">
              ¿Descartar lo escrito?
            </h3>
            <p className="mt-2 text-body text-text-secondary">
              Los datos de este formulario no se guardarán.
            </p>
            <div className="mt-6 flex gap-3">
              <AppButton variant="secondary" size="lg" onClick={() => setConfirmClose(false)}>
                Seguir editando
              </AppButton>
              <AppButton variant="danger" size="lg" onClick={discard}>
                Descartar
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
