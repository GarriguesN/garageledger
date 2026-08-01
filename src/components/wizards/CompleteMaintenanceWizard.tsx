"use client";

// Asistente para cerrar una tarea de mantenimiento (mockup 11, "Marcar como
// realizado").
//
// Sigue siendo un asistente y no un botón con confirmación porque la acción
// no es trivial: cierra la tarea, sube el cuentakilómetros del coche y, si
// se repite, programa la siguiente. El paso de resumen enseña eso antes de
// hacerlo, en vez de explicarlo después.

import { useRouter } from "next/navigation";
import { AppInput, AppDatePicker } from "@/components/ui";
import { Wizard, FormSection, SummaryStep, type WizardStepDef } from "@/components/wizard";
import { formatDate, formatKm } from "@/lib/format";
import { errorFrom, parseWhole, todayIso } from "./shared";

export interface CompleteMaintenanceWizardProps {
  open: boolean;
  onClose: () => void;
  taskId: number;
  carId: number;
  partName: string;
  currentKm: number;
  /** La tarea se repite sola: al cerrarla se programará la siguiente. */
  recurring: boolean;
}

interface CompleteValues {
  date: string;
  km: string;
}

export default function CompleteMaintenanceWizard({
  open, onClose, taskId, carId, partName, currentKm, recurring,
}: CompleteMaintenanceWizardProps) {
  const router = useRouter();

  const steps: WizardStepDef<CompleteValues>[] = [
    {
      id: "detalles",
      title: "Detalles del servicio",
      subtitle: `Cuándo y con cuántos kilómetros se hizo ${partName.toLowerCase()}`,
      validate: (v) => {
        const km = parseWhole(v.km);
        return {
          km: km == null || km < 0 ? "Introduce un kilometraje válido" : undefined,
          date: v.date ? undefined : "Añade la fecha",
        };
      },
      render: ({ values, set, errors, fieldRef }) => (
        <FormSection>
          <AppDatePicker
            ref={fieldRef("date")}
            label="Fecha de realización"
            value={values.date}
            error={errors.date}
            onChange={(e) => set("date", e.target.value)}
          />
          <AppInput
            ref={fieldRef("km")}
            label="Kilómetros"
            inputMode="numeric"
            suffix="km"
            value={values.km}
            error={errors.km}
            hint={
              (parseWhole(values.km) ?? 0) > currentKm
                ? `Se actualizará el cuentakilómetros del coche a ${formatKm(parseWhole(values.km))}.`
                : undefined
            }
            onChange={(e) => set("km", e.target.value)}
          />
        </FormSection>
      ),
    },
    {
      id: "resumen",
      title: "Resumen",
      subtitle: "Revisa antes de cerrar el mantenimiento",
      nextLabel: "Confirmar",
      render: ({ values, goTo }) => (
        <SummaryStep
          onEdit={goTo}
          groups={[
            {
              icon: "wrench",
              accent: "orange",
              title: partName,
              editStepId: "detalles",
              rows: [
                { label: "Fecha", value: formatDate(values.date) },
                { label: "Kilómetros", value: formatKm(parseWhole(values.km)) },
                {
                  label: "Al confirmar",
                  value: recurring
                    ? "Se programará el siguiente según su intervalo"
                    : "Se cerrará esta tarea",
                },
              ],
            },
          ]}
        />
      ),
    },
  ];

  async function submit(values: CompleteValues) {
    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        id: taskId,
        currentKm: parseWhole(values.km),
        currentDate: values.date,
        scheduleNext: recurring,
      }),
    });
    if (!res.ok) throw await errorFrom(res, "No se pudo completar el mantenimiento");

    router.refresh();

    return {
      message: "Mantenimiento completado",
      headline: partName,
      detail: formatKm(parseWhole(values.km)),
      meta: formatDate(values.date),
      primaryLabel: "Ver mantenimientos",
      onPrimary: () => {
        onClose();
        router.replace(`/coches/${carId}/mantenimiento`);
      },
    };
  }

  return (
    <Wizard
      open={open}
      title="Marcar como realizado"
      steps={steps}
      initialValues={{ date: todayIso(), km: String(currentKm) }}
      submitLabel="Confirmar"
      onSubmit={submit}
      onClose={onClose}
    />
  );
}
