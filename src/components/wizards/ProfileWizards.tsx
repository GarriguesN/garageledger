"use client";

// Los dos formularios del perfil, con el mismo asistente que el resto.
//
// El nombre cabe en un paso y el PIN en dos (escribirlo y repetirlo), que
// además es la forma correcta de pedirlo: comparar dos campos en la misma
// pantalla invita a copiar y pegar el error.

import { AppInput } from "@/components/ui";
import { Wizard, FormSection, type WizardStepDef } from "@/components/wizard";
import { errorFrom } from "./shared";

// ── Nombre ────────────────────────────────────────────────────────

export interface NameWizardProps {
  open: boolean;
  onClose: () => void;
  initialName: string;
  onSaved: (name: string) => void;
}

export function NameWizard({ open, onClose, initialName, onSaved }: NameWizardProps) {
  const steps: WizardStepDef<{ name: string }>[] = [
    {
      id: "nombre",
      title: "Tu nombre",
      subtitle: "Cómo quieres que te llamemos en la app",
      nextLabel: "Guardar",
      validate: (v) => ({ name: v.name.trim() ? undefined : "Escribe un nombre" }),
      render: ({ values, set, errors, fieldRef }) => (
        <FormSection>
          <AppInput
            ref={fieldRef("name")}
            label="Nombre"
            placeholder="Cómo quieres que te llamemos"
            maxLength={40}
            value={values.name}
            error={errors.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </FormSection>
      ),
    },
  ];

  async function submit(values: { name: string }) {
    const value = values.name.trim();
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "display_name", value }),
    });
    if (!res.ok) throw await errorFrom(res, "No se pudo guardar el nombre");
    onSaved(value);

    return {
      message: "Nombre actualizado",
      headline: value,
      primaryLabel: "Hecho",
      onPrimary: onClose,
    };
  }

  return (
    <Wizard
      open={open}
      title="Tu nombre"
      steps={steps}
      initialValues={{ name: initialName }}
      submitLabel="Guardar"
      onSubmit={submit}
      onClose={onClose}
    />
  );
}

// ── PIN ───────────────────────────────────────────────────────────

export interface PinWizardProps {
  open: boolean;
  onClose: () => void;
  /** Cambia el título: no es lo mismo poner el primero que sustituirlo. */
  configured: boolean;
  onSaved: () => void;
}

interface PinValues {
  pin: string;
  confirm: string;
}

export function PinWizard({ open, onClose, configured, onSaved }: PinWizardProps) {
  const steps: WizardStepDef<PinValues>[] = [
    {
      id: "nuevo",
      title: configured ? "Nuevo PIN" : "Elige un PIN",
      subtitle: "Entre 4 y 10 dígitos",
      validate: (v) => ({
        pin:
          v.pin.length < 4 || v.pin.length > 10
            ? "El PIN debe tener entre 4 y 10 dígitos"
            : !/^\d+$/.test(v.pin)
              ? "El PIN solo puede tener dígitos"
              : undefined,
      }),
      render: ({ values, set, errors, fieldRef }) => (
        <FormSection>
          <AppInput
            ref={fieldRef("pin")}
            label="PIN"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={values.pin}
            error={errors.pin}
            onChange={(e) => set("pin", e.target.value)}
          />
        </FormSection>
      ),
    },
    {
      id: "confirmar",
      title: "Repite el PIN",
      subtitle: "Para asegurarnos de que no hay una errata",
      nextLabel: "Guardar PIN",
      validate: (v) => ({
        confirm: v.confirm === v.pin ? undefined : "Los PIN no coinciden",
      }),
      render: ({ values, set, errors, fieldRef }) => (
        <FormSection>
          <AppInput
            ref={fieldRef("confirm")}
            label="Repite el PIN"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={values.confirm}
            error={errors.confirm}
            onChange={(e) => set("confirm", e.target.value)}
          />
        </FormSection>
      ),
    },
  ];

  async function submit(values: PinValues) {
    const res = await fetch("/api/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set", pin: values.pin }),
    });
    if (!res.ok) throw await errorFrom(res, "No se pudo guardar el PIN");
    onSaved();

    return {
      message: "PIN actualizado",
      headline: "Acceso protegido",
      meta: "Te lo pediremos al abrir la app",
      primaryLabel: "Hecho",
      onPrimary: onClose,
    };
  }

  return (
    <Wizard
      open={open}
      title={configured ? "Cambiar PIN" : "Establecer PIN"}
      steps={steps}
      initialValues={{ pin: "", confirm: "" }}
      submitLabel="Guardar PIN"
      onSubmit={submit}
      onClose={onClose}
    />
  );
}
