"use client";

// Asistente de mantenimiento (mockups 11-14).
//
// Paso 1  tipo de mantenimiento (rejilla; "Personalizado" abre el catálogo)
// Paso 2  detalles del servicio: coste, taller, taller o DIY, fecha
// Paso 3  próximo: cada X km o cada X meses, y con cuánta antelación avisar
// Paso 4  resumen
//
// Guardar hace dos cosas, que es exactamente lo que el usuario entiende por
// "he hecho el mantenimiento": apunta el gasto (si lo hubo) y programa el
// siguiente con el intervalo elegido. Sin coste no se inventa un gasto de
// 0 €; solo se programa.

import { useRouter } from "next/navigation";
import {
  AppInput, AppTextarea, AppSelect, AppDatePicker, AppTypeTile, AppToggle, AppSegmented,
} from "@/components/ui";
import { Wizard, FormSection, InputCard, SummaryStep, type WizardStepDef } from "@/components/wizard";
import { MAINTENANCE_PRESETS } from "@/lib/maintenance/presets";
import {
  MAINTENANCE_QUICK_TYPES, MAINTENANCE_QUICK_TYPE_MAP, quickTypeDefaults,
} from "@/lib/maintenance/quickTypes";
import { formatCurrencyPrecise, formatDate, formatKm } from "@/lib/format";
import { addMonths, errorFrom, parseDecimal, parseWhole, todayIso } from "./shared";

export interface MaintenanceWizardProps {
  carId: number;
  currentKm: number;
  /** Talleres ya usados, para no volver a teclearlos. */
  workshops?: string[];
}

interface MaintenanceValues {
  typeId: string;
  partName: string;
  presetKey: string | null;
  iconKey: string | null;
  coste: string;
  taller: string;
  servicio: "taller" | "diy";
  date: string;
  km: string;
  /** Con qué se mide el próximo: kilómetros o tiempo. */
  intervalMode: "km" | "tiempo";
  intervalKm: string;
  intervalMonths: string;
  recordar: boolean;
  recordarDias: string;
  notas: string;
}

const REMINDER_OPTIONS = [
  { value: "7", label: "1 semana antes" },
  { value: "15", label: "15 días antes" },
  { value: "30", label: "1 mes antes" },
  { value: "60", label: "2 meses antes" },
];

/** Próxima fecha y próximo km a partir de lo elegido. Se recalculan al
 *  vuelo: guardar un valor derivado es pedir que un día no cuadre con lo
 *  que lo produjo. */
function nextService(v: MaintenanceValues): { nextKm: number | null; nextDate: string | null } {
  const km = parseWhole(v.km);
  const intervalKm = parseWhole(v.intervalKm);
  const months = parseWhole(v.intervalMonths);
  return {
    nextKm: v.intervalMode === "km" && km != null && intervalKm != null ? km + intervalKm : null,
    nextDate: v.intervalMode === "tiempo" && months != null && v.date ? addMonths(v.date, months) : null,
  };
}

export default function MaintenanceWizard({ carId, currentKm, workshops = [] }: MaintenanceWizardProps) {
  const router = useRouter();

  const initialValues: MaintenanceValues = {
    typeId: "",
    partName: "",
    presetKey: null,
    iconKey: null,
    coste: "",
    taller: "",
    servicio: "taller",
    date: todayIso(),
    km: currentKm > 0 ? String(currentKm) : "",
    intervalMode: "km",
    intervalKm: "",
    intervalMonths: "",
    recordar: true,
    recordarDias: "7",
    notas: "",
  };

  const steps: WizardStepDef<MaintenanceValues>[] = [
    {
      id: "tipo",
      title: "Tipo de mantenimiento",
      subtitle: "Selecciona el tipo de mantenimiento",
      validate: (v) => ({
        typeId: v.typeId ? undefined : "Elige un tipo de mantenimiento",
        // "Personalizado" pide el nombre aquí mismo, así que aquí es donde
        // se exige: el botón no se enciende hasta tenerlo.
        partName:
          MAINTENANCE_QUICK_TYPE_MAP[v.typeId]?.custom && !v.partName.trim()
            ? "Ponle un nombre al mantenimiento"
            : undefined,
      }),
      render: ({ values, set, patch, pick, errors, fieldRef }) => (
        <>
          <div role="radiogroup" aria-label="Tipo de mantenimiento" className="grid grid-cols-2 gap-3">
            {MAINTENANCE_QUICK_TYPES.map((t) => (
              <AppTypeTile
                key={t.id}
                icon={t.icon}
                label={t.label}
                accent={t.accent}
                selected={values.typeId === t.id}
                onClick={() => {
                  const defaults = quickTypeDefaults(t.id);
                  const chosen = {
                    typeId: t.id,
                    partName: defaults.partName,
                    presetKey: defaults.presetKey,
                    iconKey: defaults.iconKey,
                    intervalKm: defaults.intervalKm,
                    intervalMonths: defaults.intervalMonths,
                    // Un mantenimiento sin intervalo de km (la ITV) se
                    // programa por tiempo: es lo único que puede.
                    intervalMode: (defaults.intervalKm ? "km" : "tiempo") as "km" | "tiempo",
                  };
                  // Elegir un tipo del catálogo cierra el paso y avanza.
                  // "Personalizado" no: todavía hay que ponerle nombre, así
                  // que se queda aquí para rellenarlo.
                  if (t.custom) patch(chosen);
                  else pick(chosen);
                }}
              />
            ))}
          </div>
          {errors.typeId && (
            <p role="alert" className="mt-3 text-caption text-danger">
              {errors.typeId}
            </p>
          )}
          {/* Solo se ve al elegir "Personalizado": el resto del catálogo
              sigue disponible sin ocupar sitio en la rejilla. */}
          {MAINTENANCE_QUICK_TYPE_MAP[values.typeId]?.custom && (
            <div className="mt-6">
              <AppSelect
                label="Elegir del catálogo (opcional)"
                placeholder="Busca un mantenimiento"
                value={values.presetKey ?? ""}
                onChange={(e) => {
                  const preset = MAINTENANCE_PRESETS.find((p) => p.key === e.target.value);
                  if (!preset) return;
                  patch({
                    presetKey: preset.key,
                    partName: preset.part_name,
                    iconKey: preset.icon_key,
                    intervalKm: String(preset.interval_km),
                    intervalMonths: String(preset.interval_months),
                    notas: preset.description,
                  });
                }}
                options={MAINTENANCE_PRESETS.map((p) => ({
                  value: p.key,
                  label: p.part_name,
                  group: p.category,
                }))}
              />
              <AppInput
                ref={fieldRef("partName")}
                className="mt-4"
                label="Nombre del mantenimiento"
                placeholder="Cambio de aceite"
                value={values.partName}
                error={errors.partName}
                onChange={(e) => set("partName", e.target.value)}
              />
            </div>
          )}
        </>
      ),
    },

    {
      id: "detalles",
      title: "Detalles del servicio",
      subtitle: "Añade información del servicio",
      validate: (v) => {
        const errors: Record<string, string> = {};
        if (!v.partName.trim()) errors.partName = "Ponle un nombre al mantenimiento";
        if (v.coste && parseDecimal(v.coste) == null) errors.coste = "Importe no válido";
        if (v.km && parseWhole(v.km) == null) errors.km = "Kilometraje no válido";
        return errors;
      },
      render: ({ values, set, errors, fieldRef }) => (
        <FormSection>
          {!MAINTENANCE_QUICK_TYPE_MAP[values.typeId]?.custom && (
            <AppInput
              ref={fieldRef("partName")}
              label="Mantenimiento"
              value={values.partName}
              error={errors.partName}
              onChange={(e) => set("partName", e.target.value)}
            />
          )}
          <AppInput
            ref={fieldRef("coste")}
            label="Coste"
            inputMode="decimal"
            placeholder="0,00"
            suffix="€"
            value={values.coste}
            error={errors.coste}
            hint="Déjalo vacío si solo quieres programarlo."
            onChange={(e) => set("coste", e.target.value)}
          />
          {workshops.length > 0 ? (
            <AppSelect
              label="Taller"
              placeholder="Selecciona un taller"
              value={values.taller}
              onChange={(e) => set("taller", e.target.value)}
              options={workshops.map((w) => ({ value: w, label: w }))}
            />
          ) : (
            <AppInput
              label="Taller"
              placeholder="Taller Mecánico Rápido"
              value={values.taller}
              onChange={(e) => set("taller", e.target.value)}
            />
          )}
          <AppSegmented
            label="Tipo de servicio"
            value={values.servicio}
            onChange={(v) => set("servicio", v)}
            options={[
              { value: "taller", label: "Taller" },
              { value: "diy", label: "DIY" },
            ]}
          />
          <AppDatePicker
            label="Fecha"
            value={values.date}
            onChange={(e) => set("date", e.target.value)}
          />
          <AppInput
            ref={fieldRef("km")}
            label="Kilómetros"
            inputMode="numeric"
            suffix="km"
            value={values.km}
            error={errors.km}
            onChange={(e) => set("km", e.target.value)}
          />
        </FormSection>
      ),
    },

    {
      id: "proximo",
      title: "Próximo mantenimiento",
      subtitle: "Configura el próximo servicio",
      validate: (v) => {
        if (v.intervalMode === "km" && parseWhole(v.intervalKm) == null) {
          return { intervalKm: "Indica cada cuántos kilómetros se repite" };
        }
        if (v.intervalMode === "tiempo" && parseWhole(v.intervalMonths) == null) {
          return { intervalMonths: "Indica cada cuántos meses se repite" };
        }
        return {};
      },
      render: ({ values, set, errors, fieldRef }) => {
        const { nextKm, nextDate } = nextService(values);
        return (
          <FormSection>
            <AppSegmented
              label="Cada"
              value={values.intervalMode}
              onChange={(v) => set("intervalMode", v)}
              options={[
                { value: "km", label: "Km" },
                { value: "tiempo", label: "Tiempo" },
              ]}
            />

            {values.intervalMode === "km" ? (
              <AppInput
                ref={fieldRef("intervalKm")}
                label="Cada"
                inputMode="numeric"
                suffix="km"
                placeholder="10000"
                value={values.intervalKm}
                error={errors.intervalKm}
                hint={nextKm != null ? `Próximo a los ${formatKm(nextKm)}.` : undefined}
                onChange={(e) => set("intervalKm", e.target.value)}
              />
            ) : (
              <AppInput
                ref={fieldRef("intervalMonths")}
                label="Cada"
                inputMode="numeric"
                suffix="meses"
                placeholder="12"
                value={values.intervalMonths}
                error={errors.intervalMonths}
                hint={nextDate ? `Próximo el ${formatDate(nextDate)}.` : undefined}
                onChange={(e) => set("intervalMonths", e.target.value)}
              />
            )}

            <InputCard>
              <AppToggle
                label="Recordarme antes"
                hint="Aparecerá en tus notificaciones"
                checked={values.recordar}
                onChange={(v) => set("recordar", v)}
              />
              {values.recordar && (
                <AppSelect
                  label="Avisarme"
                  value={values.recordarDias}
                  onChange={(e) => set("recordarDias", e.target.value)}
                  options={REMINDER_OPTIONS}
                />
              )}
            </InputCard>

            <AppTextarea
              label="Notas (opcional)"
              placeholder="Cualquier detalle que quieras recordar"
              value={values.notas}
              onChange={(e) => set("notas", e.target.value)}
            />
          </FormSection>
        );
      },
    },

    {
      id: "resumen",
      title: "Resumen del mantenimiento",
      subtitle: "Revisa y guarda el mantenimiento",
      nextLabel: "Guardar mantenimiento",
      render: ({ values, goTo }) => {
        const { nextKm, nextDate } = nextService(values);
        const type = MAINTENANCE_QUICK_TYPE_MAP[values.typeId];
        const coste = parseDecimal(values.coste);
        return (
          <SummaryStep
            onEdit={goTo}
            groups={[
              {
                icon: type?.icon ?? "wrench",
                accent: type?.accent ?? "orange",
                title: values.partName,
                subtitle: [formatDate(values.date), values.taller].filter((s) => s && s !== "—").join(" · "),
                editStepId: "detalles",
                rows: [
                  { label: "Coste", value: coste != null ? formatCurrencyPrecise(coste) : "—", emphasis: true },
                  { label: "Servicio", value: values.servicio === "diy" ? "DIY" : "Taller" },
                  {
                    label: "Kilómetros",
                    value: parseWhole(values.km) != null ? formatKm(parseWhole(values.km)) : "—",
                  },
                ],
              },
              {
                title: "Próximo",
                editStepId: "proximo",
                rows: [
                  { label: "Próximo", value: nextKm != null ? formatKm(nextKm) : "—" },
                  { label: "O el", value: nextDate ? formatDate(nextDate) : "—" },
                  {
                    label: "Recordatorio",
                    value: values.recordar
                      ? REMINDER_OPTIONS.find((o) => o.value === values.recordarDias)?.label ?? "—"
                      : "Sin recordatorio",
                  },
                ],
              },
            ]}
          />
        );
      },
    },
  ];

  async function submit(values: MaintenanceValues) {
    const { nextKm, nextDate } = nextService(values);
    const km = parseWhole(values.km);
    const coste = parseDecimal(values.coste);
    const intervalKm = values.intervalMode === "km" ? parseWhole(values.intervalKm) : null;
    const intervalMonths = values.intervalMode === "tiempo" ? parseWhole(values.intervalMonths) : null;

    // 1. La tarea programada: es la razón de ser de la pantalla.
    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        carId,
        part_name: values.partName.trim(),
        part_brand: values.taller.trim(),
        current_km: km,
        current_date: values.date || null,
        next_km: nextKm,
        next_date: nextDate,
        interval_km: intervalKm,
        interval_months: intervalMonths,
        notes: values.notas.trim(),
        preset_key: values.presetKey,
        icon_key: values.iconKey,
        reminder_days: values.recordar ? parseWhole(values.recordarDias) : null,
      }),
    });
    if (!res.ok) throw await errorFrom(res, "No se pudo guardar el mantenimiento");

    // 2. El gasto, solo si hubo coste. Un mantenimiento programado para el
    //    futuro no es un gasto de hoy.
    if (coste != null && coste > 0) {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          tipo: values.servicio === "diy" ? "Mantenimiento (DIY)" : "Mantenimiento (Taller)",
          tipoId: values.servicio === "diy" ? "mantenimiento_diy" : "mantenimiento",
          importe: coste,
          date: values.date,
          descripcion: values.partName.trim(),
          referencia: values.taller.trim(),
          km,
          presetKey: values.presetKey ?? undefined,
        }),
      });
    }

    router.refresh();

    return {
      message: "Mantenimiento guardado correctamente",
      headline: coste != null && coste > 0 ? formatCurrencyPrecise(coste) : values.partName,
      detail: coste != null && coste > 0 ? values.partName : undefined,
      meta: nextKm != null
        ? `Próximo a los ${formatKm(nextKm)}`
        : nextDate ? `Próximo el ${formatDate(nextDate)}` : undefined,
      primaryLabel: "Ver mantenimiento",
      onPrimary: () => router.push(`/coches/${carId}/mantenimiento`),
      secondaryLabel: "Añadir otro",
    };
  }

  return (
    <Wizard
      mode="page"
      hasBottomNav
      title="Añadir mantenimiento"
      steps={steps}
      initialValues={initialValues}
      submitLabel="Guardar mantenimiento"
      onSubmit={submit}
      onClose={() => router.push(`/coches/${carId}/mantenimiento`)}
    />
  );
}
