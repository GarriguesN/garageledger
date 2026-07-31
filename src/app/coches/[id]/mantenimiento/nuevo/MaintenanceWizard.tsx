"use client";

// Asistente de "Añadir mantenimiento" (mockup 11-14, 4 pasos).
//
//   Paso 1 · Tipo de mantenimiento
//     Rejilla 3x2 con los 6 tiles del mockup: Cambio de aceite, Frenos,
//     Neumáticos, Batería, ITV, Personalizado.
//   Paso 2 · Detalles del servicio
//     Coste, taller, tipo (Taller / DIY), fecha.
//   Paso 3 · Próximo mantenimiento
//     Segmented Km/Tiempo, "cada X km" o "el [fecha]", toggle "Recordarme
//     antes", select "1 mes / 1 semana antes".
//   Paso 4 · Resumen del mantenimiento
//     Card resumen + guardar.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppCard, AppInput, AppSelect, AppDatePicker, AppTextarea,
  AppTypeTile,
  Wizard, WizardSummaryCard,
  type WizardStep, type WizardErrors,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";

export interface MaintenanceWizardProps {
  /** Default true. Si es false, el wizard no renderiza. */
  open?: boolean;
  /** Acción al pulsar Cancelar / Cerrar. Default: router.back(). */
  onClose?: () => void;
  carId: number;
  currentKm: number;
}

type TileType = "aceite" | "frenos" | "neumaticos" | "bateria" | "itv" | "personalizado";

const TILES: Array<{ id: TileType; label: string; icon: "droplet" | "tire" | "battery" | "success" | "wrench" }> = [
  { id: "aceite", label: "Cambio de aceite", icon: "droplet" },
  { id: "frenos", label: "Frenos", icon: "tire" },
  { id: "neumaticos", label: "Neumáticos", icon: "tire" },
  { id: "bateria", label: "Batería", icon: "battery" },
  { id: "itv", label: "Inspección (ITV)", icon: "success" },
  { id: "personalizado", label: "Personalizado", icon: "wrench" },
];

interface MaintenanceFormValues {
  tipoId: TileType | "";
  name: string;
  coste: string;
  taller: string;
  /** "taller" si lo hace un mecánico, "diy" si lo hace el usuario. */
  tipo: "taller" | "diy";
  date: string;
  /** "km" o "tiempo" o "ambos" o "none". */
  reminderMode: "km" | "tiempo" | "ambos" | "none";
  intervalKm: string;
  intervalMonths: string;
  nextKm: string;
  nextDate: string;
  recordar: boolean;
  /** "1 mes antes", "1 semana antes", "1 día antes". */
  avisar: "1m" | "1w" | "1d";
  notas: string;
}

const EMPTY: MaintenanceFormValues = {
  tipoId: "",
  name: "",
  coste: "",
  taller: "",
  tipo: "taller",
  date: "",
  reminderMode: "km",
  intervalKm: "",
  intervalMonths: "",
  nextKm: "",
  nextDate: "",
  recordar: true,
  avisar: "1m",
  notas: "",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const AVISAR_LABEL: Record<MaintenanceFormValues["avisar"], string> = {
  "1m": "1 mes antes",
  "1w": "1 semana antes",
  "1d": "1 día antes",
};

export default function MaintenanceWizard({ open, onClose, carId, currentKm }: MaintenanceWizardProps) {
  const router = useRouter();
  const [form, setForm] = useState<MaintenanceFormValues>(() => ({
    ...EMPTY,
    date: todayIso(),
    nextKm: currentKm > 0 ? String(currentKm) : "",
  }));
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedTask, setSavedTask] = useState<{ name: string; coste: number | null } | null>(null);

  // Auto-cálculo del siguiente: si hay intervalo_km y next_km único, el
  // proximo_km_seguro_pts = currentKm + intervalKm.
  const computedNextKm = useMemo(() => {
    const ck = parseInt(form.nextKm, 10);
    const ik = parseInt(form.intervalKm, 10);
    if (Number.isFinite(ck) && Number.isFinite(ik) && ck > 0 && ik > 0) {
      return String(ck + ik);
    }
    return null;
  }, [form.nextKm, form.intervalKm]);

  const computedNextDate = useMemo(() => {
    if (!form.intervalMonths) return null;
    const m = parseInt(form.intervalMonths, 10);
    if (!Number.isFinite(m) || !form.date) return null;
    const d = new Date(`${form.date}T12:00:00`);
    d.setMonth(d.getMonth() + m);
    return d.toISOString().slice(0, 10);
  }, [form.intervalMonths, form.date]);

  function setField<K extends keyof MaintenanceFormValues>(k: K, v: MaintenanceFormValues[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function pickTile(id: TileType) {
    setForm((p) => ({
      ...p,
      tipoId: id,
      name: TILES.find((t) => t.id === id)?.label ?? p.name,
    }));
  }

  const steps: WizardStep<MaintenanceFormValues>[] = [
    {
      id: "type",
      title: "Tipo de mantenimiento",
      subtitle: "Selecciona el tipo de mantenimiento.",
      fields: ["tipoId"],
      validate: (v) => (!v.tipoId ? { tipoId: "Elige un tipo" } : {}),
      render: (v, set) => (
        <div className="grid grid-cols-2 gap-3">
          {TILES.map((t) => (
            <AppTypeTile
              key={t.id}
              icon={t.icon}
              label={t.label}
              active={v.tipoId === t.id}
              onClick={() => pickTile(t.id)}
            />
          ))}
        </div>
      ),
    },
    {
      id: "details",
      title: "Detalles del servicio",
      subtitle: "Añade información del servicio.",
      fields: ["name"],
      validate: (v) => (!v.name.trim() ? { name: "Ponle un nombre al mantenimiento" } : {}),
      render: (v, set, errors) => (
        <div className="space-y-4">
          <AppCard>
            <div className="space-y-3">
              <AppInput
                label="Nombre"
                placeholder="Cambio de aceite"
                value={v.name}
                onChange={(e) => set("name", e.target.value)}
                error={errors.name}
              />
              <AppInput
                label="Coste"
                inputMode="decimal"
                placeholder="67,00"
                suffix="€"
                value={v.coste}
                onChange={(e) => set("coste", e.target.value)}
              />
              <AppInput
                label="Taller"
                placeholder="Taller Mecánico Rápido"
                value={v.taller}
                onChange={(e) => set("taller", e.target.value)}
              />
            </div>
          </AppCard>
          <AppCard>
            <p className="mb-3 text-caption font-medium text-text-secondary">Tipo de servicio</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set("tipo", "taller")}
                className={`min-h-12 rounded-button border px-4 text-body font-semibold transition-colors ${
                  v.tipo === "taller"
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface-elevated text-text"
                }`}
              >
                Taller
              </button>
              <button
                type="button"
                onClick={() => set("tipo", "diy")}
                className={`min-h-12 rounded-button border px-4 text-body font-semibold transition-colors ${
                  v.tipo === "diy"
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface-elevated text-text"
                }`}
              >
                DIY
              </button>
            </div>
          </AppCard>
          <AppCard>
            <AppDatePicker
              label="Fecha"
              value={v.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </AppCard>
        </div>
      ),
    },
    {
      id: "next",
      title: "Próximo mantenimiento",
      subtitle: "Configura el próximo servicio.",
      fields: [],
      render: (v, set) => (
        <div className="space-y-4">
          <AppCard>
            <p className="mb-3 text-caption font-medium text-text-secondary">Recordarme por</p>
            <div className="grid grid-cols-2 gap-2">
              {(["km", "tiempo", "ambos", "none"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => set("reminderMode", mode)}
                  className={`min-h-12 rounded-button border px-4 text-body font-semibold transition-colors ${
                    v.reminderMode === mode
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-surface-elevated text-text"
                  }`}
                >
                  {mode === "km" ? "Km" : mode === "tiempo" ? "Tiempo" : mode === "ambos" ? "Ambos" : "Sin recordatorio"}
                </button>
              ))}
            </div>
          </AppCard>

          {(v.reminderMode === "km" || v.reminderMode === "ambos") && (
            <AppCard>
              <div className="grid grid-cols-2 gap-3">
                <AppInput
                  label="Cada"
                  inputMode="numeric"
                  placeholder="10.000"
                  suffix="km"
                  value={v.intervalKm}
                  onChange={(e) => set("intervalKm", e.target.value)}
                />
                <AppInput
                  label="O el"
                  inputMode="numeric"
                  placeholder="132.870"
                  suffix="km"
                  value={v.nextKm}
                  onChange={(e) => set("nextKm", e.target.value)}
                  hint={computedNextKm ? `Próximo: ${computedNextKm} km` : undefined}
                />
              </div>
            </AppCard>
          )}

          {(v.reminderMode === "tiempo" || v.reminderMode === "ambos") && (
            <AppCard>
              <div className="grid grid-cols-2 gap-3">
                <AppInput
                  label="Cada"
                  inputMode="numeric"
                  placeholder="12"
                  suffix="meses"
                  value={v.intervalMonths}
                  onChange={(e) => set("intervalMonths", e.target.value)}
                />
                <AppDatePicker
                  label="O el"
                  value={v.nextDate}
                  onChange={(e) => set("nextDate", e.target.value)}
                  hint={computedNextDate ? `Próximo: ${computedNextDate}` : undefined}
                />
              </div>
            </AppCard>
          )}

          <AppCard>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={v.recordar}
                onChange={(e) => set("recordar", e.target.checked)}
                className="size-5 accent-primary"
              />
              <span className="text-body text-text">Recordarme antes</span>
            </label>
            {v.recordar && (
              <AppSelect
                className="mt-3"
                label="Avisarme"
                value={v.avisar}
                onChange={(e) => set("avisar", e.target.value as MaintenanceFormValues["avisar"])}
                options={[
                  { value: "1m", label: "1 mes antes" },
                  { value: "1w", label: "1 semana antes" },
                  { value: "1d", label: "1 día antes" },
                ]}
              />
            )}
          </AppCard>
        </div>
      ),
    },
    {
      id: "summary",
      title: "Resumen del mantenimiento",
      subtitle: "Revisa y guarda el mantenimiento.",
      fields: [],
      render: (v, set) => (
        <div className="space-y-4">
          <WizardSummaryCard
            title={TILES.find((t) => t.id === v.tipoId)?.label ?? "Mantenimiento"}
            items={[
              { label: "Fecha", value: v.date || "—" },
              { label: "Coste", value: v.coste ? `${v.coste} €` : "—" },
              { label: "Próximo", value: computedNextKm ? `${computedNextKm} km` : v.intervalKm ? `${v.intervalKm} km` : "—" },
              { label: "O el", value: computedNextDate ?? v.nextDate ?? "—" },
              { label: "Recordatorio", value: v.recordar ? AVISAR_LABEL[v.avisar] : "— desactivado" },
              ...(v.taller ? [{ label: "Taller", value: v.taller }] : []),
              ...(v.tipo === "diy" ? [{ label: "Tipo", value: "DIY" }] : []),
            ]}
          />
          <AppCard>
            <AppTextarea
              label="Notas (opcional)"
              placeholder="Cualquier detalle que quieras recordar"
              value={v.notas}
              onChange={(e) => set("notas", e.target.value)}
            />
          </AppCard>
        </div>
      ),
    },
  ];

  async function handleSubmit(): Promise<boolean> {
    setSubmitting(true);
    try {
      const coste = parseFloat(form.coste.replace(",", "."));
      const ik = parseInt(form.intervalKm, 10);
      const im = parseInt(form.intervalMonths, 10);
      const ck = parseInt(form.nextKm, 10);
      const nextKm = computedNextKm ? parseInt(computedNextKm, 10) : null;
      const nextDate = computedNextDate ?? null;

      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          part_name: form.name.trim(),
          part_brand: "",
          part_model: form.taller,
          current_km: Number.isFinite(ck) ? ck : null,
          current_date: form.date || null,
          next_km: nextKm,
          next_date: nextDate,
          interval_km: Number.isFinite(ik) ? ik : null,
          interval_months: Number.isFinite(im) ? im : null,
          notes: form.notas,
          preset_key: null,
          icon_key: null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo guardar el mantenimiento");
      }

      // Si el usuario rellenó coste, lo añadimos como gasto anotado.
      if (Number.isFinite(coste) && coste > 0) {
        await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            carId,
            tipo: "Mantenimiento",
            tipoId: "mantenimiento",
            importe: coste,
            date: form.date,
            descripcion: form.name,
            referencia: form.taller,
          }),
        }).catch(() => null);
      }

      setSavedTask({ name: form.name, coste: Number.isFinite(coste) ? coste : null });
      setShowSuccess(true);
      return true;
    } catch {
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  if (open === false) return null;

  return (
    <div className="fixed inset-0 z-40 bg-background">
      <Wizard
        steps={steps}
        values={form}
        onChange={setForm}
        nextLabel="Siguiente"
        submitLabel="Guardar mantenimiento"
        cancelLabel="Cancelar"
        backLabel="Atrás"
        submitting={submitting}
        onSubmit={handleSubmit}
        onClose={onClose ?? (() => router.back())}
        success={{
          show: showSuccess,
          subtitle: "Mantenimiento guardado correctamente",
          highlight: savedTask?.coste != null ? formatCurrency(savedTask.coste) : undefined,
          detail: savedTask?.name,
          primary: {
            label: "Ver mantenimiento",
            onClick: () => {
              setShowSuccess(false);
              router.push(`/coches/${carId}/mantenimiento`);
            },
          },
          secondary: {
            label: "Añadir otro",
            onClick: () => {
              setShowSuccess(false);
              setForm({
                ...EMPTY,
                date: todayIso(),
                nextKm: currentKm > 0 ? String(currentKm) : "",
              });
              router.refresh();
            },
          },
        }}
      />
    </div>
  );
}
