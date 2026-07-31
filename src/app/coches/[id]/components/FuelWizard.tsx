"use client";

// Asistente de "Añadir combustible" (mockup 8-10, 3 pasos).
//
//   Paso 1 · Cantidad y precio
//     Litros, importe total, precio/L (calculado).
//   Paso 2 · Detalles adicionales
//     Gasolinera, fecha, km, depósito (Lleno / 3/4 / 1/2 / 1/4).
//   Paso 3 · Resumen del repostaje
//     Card resumen + guardar.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppCard, AppInput, AppSelect, AppDatePicker,
  Wizard, WizardSummaryCard,
  type WizardStep, type WizardErrors,
} from "@/components/ui";
import { formatCurrencyPrecise } from "@/lib/format";

export interface FuelWizardProps {
  open: boolean;
  onClose: () => void;
  carId: number;
  currentKm: number;
  stations: string[];
}

interface FuelFormValues {
  litros: string;
  importe: string;
  date: string;
  km: string;
  estacion: string;
  estacionOtra: string;
  deposito: "lleno" | "3_4" | "1_2" | "1_4" | "vacio";
}

const DEPOSITO_LABELS: Record<FuelFormValues["deposito"], string> = {
  lleno: "Lleno",
  "3_4": "3/4",
  "1_2": "1/2",
  "1_4": "1/4",
  vacio: "Vacío",
};

const EMPTY: FuelFormValues = {
  litros: "",
  importe: "",
  date: "",
  km: "",
  estacion: "",
  estacionOtra: "",
  deposito: "lleno",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function FuelWizard({
  open, onClose, carId, currentKm, stations,
}: FuelWizardProps) {
  const router = useRouter();
  const [form, setForm] = useState<FuelFormValues>(() => ({
    ...EMPTY,
    date: todayIso(),
    km: currentKm > 0 ? String(currentKm) : "",
  }));
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedExpense, setSavedExpense] = useState<{ importe: number; descripcion: string; date: string } | null>(null);

  const pricePerLiter = useMemo(() => {
    const importe = parseFloat(form.importe.replace(",", "."));
    const litros = parseFloat(form.litros.replace(",", "."));
    if (!Number.isFinite(importe) || !Number.isFinite(litros) || litros <= 0) return null;
    return importe / litros;
  }, [form.importe, form.litros]);

  function setField<K extends keyof FuelFormValues>(k: K, v: FuelFormValues[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const steps: WizardStep<FuelFormValues>[] = [
    {
      id: "qty",
      title: "Cantidad y precio",
      subtitle: "Introduce los datos del repostaje.",
      fields: ["litros", "importe"],
      validate: (v) => {
        const errs: WizardErrors = {};
        const l = parseFloat(v.litros.replace(",", "."));
        if (!Number.isFinite(l) || l <= 0) errs.litros = "Introduce los litros repostados";
        const imp = parseFloat(v.importe.replace(",", "."));
        if (!Number.isFinite(imp) || imp < 0) errs.importe = "Introduce el importe total";
        return errs;
      },
      render: (v, set, errors) => (
        <AppCard>
          <div className="grid grid-cols-2 gap-3">
            <AppInput
              label="Litros"
              inputMode="decimal"
              placeholder="40,00"
              suffix="L"
              value={v.litros}
              onChange={(e) => set("litros", e.target.value)}
              error={errors.litros}
            />
            <AppInput
              label="Importe total"
              inputMode="decimal"
              placeholder="53,00"
              suffix="€"
              value={v.importe}
              onChange={(e) => set("importe", e.target.value)}
              error={errors.importe}
            />
            <AppInput
              label="Precio por litro"
              computed
              readOnly
              tabIndex={-1}
              className="col-span-2"
              value={pricePerLiter != null ? `${formatCurrencyPrecise(pricePerLiter, 3)}/L` : "—"}
            />
          </div>
        </AppCard>
      ),
    },
    {
      id: "details",
      title: "Detalles adicionales",
      subtitle: "Completa la información del repostaje.",
      fields: [],
      render: (v, set) => (
        <div className="space-y-4">
          <AppCard>
            <div className="space-y-4">
              <AppInput
                label="Gasolinera"
                placeholder="Repsol, Cepsa…"
                value={v.estacion === "__nueva__" ? v.estacionOtra : v.estacion}
                onChange={(e) => set("estacion", e.target.value)}
                list="fuel-stations"
              />
              <datalist id="fuel-stations">
                {stations.map((s) => <option key={s} value={s} />)}
              </datalist>
              <AppDatePicker
                label="Fecha"
                value={v.date}
                onChange={(e) => set("date", e.target.value)}
              />
              <AppInput
                label="Kilometraje"
                inputMode="numeric"
                placeholder="0"
                suffix="km"
                value={v.km}
                onChange={(e) => set("km", e.target.value)}
              />
              <AppSelect
                label="Depósito"
                value={v.deposito}
                onChange={(e) => set("deposito", e.target.value as FuelFormValues["deposito"])}
                options={([
                  { value: "lleno", label: "Lleno" },
                  { value: "3_4", label: "3/4" },
                  { value: "1_2", label: "1/2" },
                  { value: "1_4", label: "1/4" },
                  { value: "vacio", label: "Vacío" },
                ])}
              />
            </div>
          </AppCard>
        </div>
      ),
    },
    {
      id: "summary",
      title: "Resumen del repostaje",
      subtitle: "Revisa y guarda el repostaje.",
      fields: [],
      render: (v, _set) => (
        <WizardSummaryCard
          title="Repostaje"
          items={[
            { label: "Importe total", value: v.importe ? `${v.importe} €` : "—" },
            { label: "Precio por litro", value: pricePerLiter != null ? `${formatCurrencyPrecise(pricePerLiter, 3)}/L` : "—" },
            { label: "Litros", value: v.litros ? `${v.litros} L` : "—" },
            { label: "Kilometraje", value: v.km ? `${v.km} km` : "—" },
            { label: "Depósito", value: DEPOSITO_LABELS[v.deposito] },
            { label: "Gasolinera", value: v.estacion || "—" },
            { label: "Fecha", value: v.date || "—" },
          ]}
        />
      ),
    },
  ];

  async function handleSubmit(): Promise<boolean> {
    setSubmitting(true);
    try {
      const importe = parseFloat(form.importe.replace(",", "."));
      const descripcion = form.estacion
        ? `Repostaje ${form.estacion}`
        : "Repostaje";

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          tipo: "Combustible",
          tipoId: "carburante",
          importe,
          date: form.date,
          descripcion,
          referencia: form.estacion,
          litros: parseFloat(form.litros.replace(",", ".")),
          km: form.km ? parseInt(form.km, 10) : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo guardar el repostaje");
      }
      setSavedExpense({ importe, descripcion, date: form.date });
      setShowSuccess(true);
      return true;
    } catch {
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-background">
      <Wizard
        steps={steps}
        values={form}
        onChange={setForm}
        nextLabel="Siguiente"
        submitLabel="Guardar repostaje"
        cancelLabel="Cancelar"
        backLabel="Atrás"
        submitting={submitting}
        onSubmit={handleSubmit}
        onClose={onClose}
        success={{
          show: showSuccess,
          subtitle: "Repostaje guardado correctamente",
          highlight: savedExpense ? formatCurrencyPrecise(savedExpense.importe, 2) : undefined,
          detail: savedExpense
            ? `${savedExpense.descripcion} · ${savedExpense.date}`
            : undefined,
          primary: {
            label: "Ver en actividad",
            onClick: () => {
              setShowSuccess(false);
              router.push(`/coches/${carId}/actividad`);
            },
          },
          secondary: {
            label: "Añadir otro repostaje",
            onClick: () => {
              setShowSuccess(false);
              setForm({
                ...EMPTY,
                date: todayIso(),
                km: currentKm > 0 ? String(currentKm) : "",
              });
              router.refresh();
            },
          },
        }}
      />
    </div>
  );
}
