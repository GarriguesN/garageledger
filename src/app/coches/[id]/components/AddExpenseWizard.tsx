"use client";

// Asistente de "Añadir gasto" (mockup 5-7, 3 pasos).
//
//   Paso 1 · ¿Qué tipo de gasto es?
//     Rejilla 2x3 de AppTypeTile (Combustible, Mantenimiento, Seguro,
//     Parking/Peaje, Impuestos, Lavado, Reparación, Otro).
//   Paso 2 · Detalles del gasto
//     Importe, fecha, descripción, método de pago. Si es combustible,
//     además litros, estación, precio/L (calculado).
//   Paso 3 · Comprobante (opcional)
//     Upload de foto + textarea "Notas adicionales" + summary card.
//
// Sin paso de summary dedicado (3 pasos según mockup), pero la card de
// resumen se proyecta al final. SuccessScreen tras guardar.
//
// API: acepta `open` para integrarse con `CarShell` (que la activa con
// un botón de la bottom nav). Si `open` es false, no renderiza nada.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppCard, AppInput, AppSelect, AppDatePicker, AppTextarea,
  AppTypeTile,
  Wizard, WizardSummaryCard,
  type WizardStep, type WizardErrors,
} from "@/components/ui";
import { colors, radius } from "@/design/tokens";
import { Camera } from "@/design/tokens/icons";
import {
  SELECTABLE_CATEGORIES, type ExpenseCategory,
} from "@/lib/expenses/categories";
import { formatCurrency, formatCurrencyPrecise } from "@/lib/format";

export interface AddExpenseWizardProps {
  open: boolean;
  onClose: () => void;
  carId: number;
  currentKm: number;
  stations: string[];
  initialCategoryId?: string;
}

interface ExpenseFormValues {
  tipoId: string;
  date: string;
  importe: string;
  descripcion: string;
  metodoPago: "" | "tarjeta" | "efectivo" | "transferencia" | "otro";
  notas: string;
  /** Campos exclusivos de combustible. */
  litros: string;
  estacion: string;
  estacionOtra: string;
  km: string;
}

const EMPTY: ExpenseFormValues = {
  tipoId: "",
  date: "",
  importe: "",
  descripcion: "",
  metodoPago: "tarjeta",
  notas: "",
  litros: "",
  estacion: "",
  estacionOtra: "",
  km: "",
};

function initialForm(currentKm: number): ExpenseFormValues {
  return {
    ...EMPTY,
    date: todayIso(),
    km: currentKm > 0 ? String(currentKm) : "",
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AddExpenseWizard({
  open,
  onClose,
  carId,
  currentKm,
  stations,
  initialCategoryId,
}: AddExpenseWizardProps) {
  const router = useRouter();
  const [category, setCategory] = useState<ExpenseCategory | null>(
    () => (initialCategoryId ? SELECTABLE_CATEGORIES.find((c) => c.id === initialCategoryId) ?? null : null),
  );
  const [form, setForm] = useState<ExpenseFormValues>(() => initialForm(currentKm));
  const [photo, setPhoto] = useState<{ file: File | null; previewUrl: string | null }>({
    file: null,
    previewUrl: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedExpense, setSavedExpense] = useState<{ importe: number; descripcion: string; date: string } | null>(null);

  useEffect(() => {
    return () => {
      if (photo.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(photo.previewUrl);
    };
  }, [photo.previewUrl]);

  const isFuel = category?.form === "fuel";
  const isMaintenance = category?.form === "maintenance";

  const pricePerLiter = useMemo(() => {
    const importe = parseFloat(form.importe.replace(",", "."));
    const litros = parseFloat(form.litros.replace(",", "."));
    if (!Number.isFinite(importe) || !Number.isFinite(litros) || litros <= 0) return null;
    return importe / litros;
  }, [form.importe, form.litros]);

  function setField<K extends keyof ExpenseFormValues>(k: K, v: ExpenseFormValues[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function choosePhoto(file: File | null) {
    if (photo.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(photo.previewUrl);
    if (!file) {
      setPhoto({ file: null, previewUrl: null });
      return;
    }
    setPhoto({ file, previewUrl: URL.createObjectURL(file) });
  }

  function resetForAnother() {
    setCategory(null);
    setForm(initialForm(currentKm));
    setPhoto({ file: null, previewUrl: null });
  }

  const steps: WizardStep<ExpenseFormValues>[] = [
    {
      id: "type",
      title: "¿Qué tipo de gasto es?",
      subtitle: "Selecciona la categoría que mejor describe el gasto.",
      fields: ["tipoId"],
      validate: (v) => (!v.tipoId ? { tipoId: "Elige una categoría" } : {}),
      render: (v, set) => (
        <div className="grid grid-cols-2 gap-3">
          {SELECTABLE_CATEGORIES.map((c) => (
            <AppTypeTile
              key={c.id}
              icon={c.icon}
              label={c.label}
              accent={c.accent}
              active={v.tipoId === c.id}
              onClick={() => set("tipoId", c.id)}
            />
          ))}
        </div>
      ),
    },
    {
      id: "details",
      title: "Detalles del gasto",
      subtitle: "Añade la información principal.",
      fields: ["importe"],
      validate: (v) => {
        const errs: WizardErrors = {};
        const imp = parseFloat(v.importe.replace(",", "."));
        if (!Number.isFinite(imp) || imp < 0) errs.importe = "Introduce un importe válido";
        if (isFuel) {
          const l = parseFloat(v.litros.replace(",", "."));
          if (!Number.isFinite(l) || l <= 0) errs.litros = "Introduce los litros repostados";
        }
        return errs;
      },
      render: (v, set, errors) => (
        <div className="space-y-4">
          <AppCard>
            <div className="grid grid-cols-2 gap-3">
              <AppInput
                label="Importe"
                inputMode="decimal"
                placeholder="0,00"
                suffix="€"
                value={v.importe}
                onChange={(e) => set("importe", e.target.value)}
                error={errors.importe}
              />
              <AppDatePicker
                label="Fecha"
                value={v.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </div>
          </AppCard>

          {isFuel && (
            <AppCard>
              <p className="mb-3 text-caption font-medium text-text-secondary">Repostaje</p>
              <div className="grid grid-cols-2 gap-3">
                <AppInput
                  label="Litros"
                  inputMode="decimal"
                  placeholder="0,00"
                  suffix="L"
                  value={v.litros}
                  onChange={(e) => set("litros", e.target.value)}
                  error={errors.litros}
                />
                <AppInput
                  label="Precio por litro"
                  computed
                  readOnly
                  tabIndex={-1}
                  value={pricePerLiter != null ? `${formatCurrencyPrecise(pricePerLiter, 3)}/L` : "—"}
                />
                <AppInput
                  label="Kilómetros"
                  inputMode="numeric"
                  placeholder="0"
                  suffix="km"
                  value={v.km}
                  onChange={(e) => set("km", e.target.value)}
                />
                {stations.length > 0 ? (
                  <AppSelect
                    label="Estación de servicio"
                    placeholder="Selecciona una estación"
                    value={v.estacion}
                    onChange={(e) => set("estacion", e.target.value)}
                    options={[
                      ...stations.map((s) => ({ value: s, label: s })),
                      { value: "__nueva__", label: "Otra…" },
                    ]}
                  />
                ) : (
                  <AppInput
                    label="Estación de servicio"
                    placeholder="Repsol, Cepsa…"
                    value={v.estacion}
                    onChange={(e) => set("estacion", e.target.value)}
                  />
                )}
              </div>
              {v.estacion === "__nueva__" && (
                <AppInput
                  className="mt-3"
                  label="Nombre de la estación"
                  placeholder="Repsol, Cepsa…"
                  value={v.estacionOtra}
                  onChange={(e) => set("estacionOtra", e.target.value)}
                />
              )}
            </AppCard>
          )}

          {!isFuel && (
            <AppCard>
              <div className="space-y-3">
                <AppInput
                  label="Descripción"
                  placeholder={category?.label ? `${category.label}…` : "Detalle del gasto"}
                  value={v.descripcion}
                  onChange={(e) => set("descripcion", e.target.value)}
                />
                <AppSelect
                  label="Método de pago"
                  value={v.metodoPago}
                  onChange={(e) => set("metodoPago", e.target.value as ExpenseFormValues["metodoPago"])}
                  options={[
                    { value: "tarjeta", label: "Tarjeta" },
                    { value: "efectivo", label: "Efectivo" },
                    { value: "transferencia", label: "Transferencia" },
                    { value: "otro", label: "Otro" },
                  ]}
                />
              </div>
            </AppCard>
          )}

          {isMaintenance && (
            <AppCard>
              <AppInput
                label="Kilómetros"
                inputMode="numeric"
                placeholder="0"
                suffix="km"
                value={v.km}
                onChange={(e) => set("km", e.target.value)}
              />
            </AppCard>
          )}
        </div>
      ),
    },
    {
      id: "receipt",
      title: "Comprobante (opcional)",
      subtitle: "Añade el ticket o una nota adicional.",
      fields: [],
      render: (v, set) => (
        <div className="space-y-4">
          <AppCard>
            <p className="mb-3 text-caption font-medium text-text-secondary">Foto del ticket</p>
            <div
              className="relative aspect-video w-full overflow-hidden"
              style={{ borderRadius: radius.image, backgroundColor: colors.surfaceElevated }}
            >
              {photo.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.previewUrl}
                  alt="Foto del ticket"
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full flex-col items-center justify-center text-text-secondary">
                  <Camera size={32} strokeWidth={1.5} aria-hidden="true" />
                  <span className="mt-2 text-caption">Subir foto</span>
                  <span className="text-caption text-text-muted">Formatos: JPG, PNG</span>
                </div>
              )}
            </div>
            <label className="mt-3 flex min-h-11 items-center">
              <span className="sr-only">Elegir foto del ticket</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => choosePhoto(e.target.files?.[0] ?? null)}
                className="block min-h-11 w-full text-caption text-text-secondary file:mr-3 file:min-h-11 file:rounded-pill file:border-0 file:bg-surface-elevated file:px-4 file:text-caption file:font-semibold file:text-text"
              />
            </label>
          </AppCard>

          <AppCard>
            <AppTextarea
              label="Notas adicionales"
              placeholder="Ej. Detalle del servicio…"
              value={v.notas}
              onChange={(e) => set("notas", e.target.value)}
            />
          </AppCard>

          <WizardSummaryCard
            title="Resumen"
            items={[
              { label: "Tipo", value: category?.label ?? "—" },
              { label: "Importe", value: v.importe ? `${v.importe} €` : "—" },
              { label: "Fecha", value: v.date || "—" },
              ...(isFuel ? [
                { label: "Litros", value: v.litros ? `${v.litros} L` : "—" },
                { label: "Precio/L", value: pricePerLiter != null ? `${formatCurrencyPrecise(pricePerLiter, 3)}` : "—" },
              ] : []),
              ...(v.descripcion ? [{ label: "Descripción", value: v.descripcion }] : []),
            ]}
          />
        </div>
      ),
    },
  ];

  async function uploadReceipt(expenseId: number): Promise<void> {
    if (!photo.file) return;
    const fd = new FormData();
    fd.append("expense_id", String(expenseId));
    fd.append("file", photo.file);
    await fetch("/api/attachments", { method: "POST", body: fd });
  }

  async function handleSubmit(): Promise<boolean> {
    if (!category) return false;
    setSubmitting(true);
    try {
      const importe = parseFloat(form.importe.replace(",", "."));
      const ref = isFuel ? (form.estacion === "__nueva__" ? form.estacionOtra : form.estacion) : "";
      const descripcion = form.descripcion || form.notas || "";

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          tipo: category.label,
          tipoId: category.id,
          importe,
          date: form.date,
          descripcion,
          referencia: ref,
          litros: isFuel ? parseFloat(form.litros.replace(",", ".")) : null,
          km: form.km ? parseInt(form.km, 10) : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo guardar el gasto");
      }
      const created = await res.json();
      await uploadReceipt(created.id);
      setSavedExpense({ importe, descripcion: descripcion || category.label, date: form.date });
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
        submitLabel="Guardar gasto"
        cancelLabel="Cancelar"
        backLabel="Atrás"
        submitting={submitting}
        onSubmit={handleSubmit}
        onClose={onClose}
        success={{
          show: showSuccess,
          subtitle: "Gasto guardado correctamente",
          highlight: savedExpense ? formatCurrency(savedExpense.importe) : undefined,
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
            label: "Añadir otro gasto",
            onClick: () => {
              setShowSuccess(false);
              resetForAnother();
              router.refresh();
            },
          },
        }}
      />
    </div>
  );
}
