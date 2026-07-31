"use client";

// Asistente de "Añadir gasto" — pantallas 3 y 4 del mockup.
//
//   Paso 1: rejilla de 8 categorías ("¿Qué quieres añadir?").
//   Paso 2: el formulario de esa categoría. Combustible tiene campos
//           propios (litros, precio/L, estación); el resto comparte el
//           genérico.
//
// Es un modal y no una ruta: el mockup lo cierra con una X y el estado a
// medias no debería sobrevivir a un refresco.
//
// Precio por litro no se guarda: se calcula al vuelo desde importe y litros.
// Guardar un valor derivado es pedir que un día no cuadre con sus dos
// factores.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppModal, AppTypeTile, AppInput, AppTextarea, AppSelect, AppDatePicker, AppButton,
} from "@/components/ui";
import {
  SELECTABLE_CATEGORIES, EXPENSE_CATEGORY_MAP, type ExpenseCategory,
} from "@/lib/expenses/categories";
import { formatCurrencyPrecise } from "@/lib/format";

export interface AddExpenseWizardProps {
  open: boolean;
  onClose: () => void;
  carId: number;
  /** Kilometraje actual: precarga el campo de km. */
  currentKm: number;
  /** Estaciones ya usadas, para el desplegable de combustible. */
  stations: string[];
  /** Salta directo al formulario de esta categoría (accesos rápidos del
   *  resumen). Sin ella, el asistente empieza en la rejilla de tipos. */
  initialCategoryId?: string;
}

interface FormState {
  date: string;
  importe: string;
  litros: string;
  km: string;
  estacion: string;
  descripcion: string;
  notas: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function initialForm(currentKm: number): FormState {
  return {
    date: todayIso(),
    importe: "",
    litros: "",
    km: currentKm > 0 ? String(currentKm) : "",
    estacion: "",
    descripcion: "",
    notas: "",
  };
}

export default function AddExpenseWizard({
  open, onClose, carId, currentKm, stations, initialCategoryId,
}: AddExpenseWizardProps) {
  const router = useRouter();
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [form, setForm] = useState<FormState>(() => initialForm(currentKm));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al abrirse con una categoría preseleccionada se salta el paso 1. Se
  // aplica en cada apertura (no solo al montar) porque el asistente
  // permanece montado entre aperturas.
  useEffect(() => {
    if (!open) return;
    setCategory(initialCategoryId ? EXPENSE_CATEGORY_MAP[initialCategoryId] ?? null : null);
  }, [open, initialCategoryId]);

  const isFuel = category?.form === "fuel";

  const pricePerLiter = useMemo(() => {
    const importe = parseFloat(form.importe.replace(",", "."));
    const litros = parseFloat(form.litros.replace(",", "."));
    if (!Number.isFinite(importe) || !Number.isFinite(litros) || litros <= 0) return null;
    return importe / litros;
  }, [form.importe, form.litros]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  function reset() {
    setCategory(null);
    setForm(initialForm(currentKm));
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSave() {
    if (!category) return;
    const importe = parseFloat(form.importe.replace(",", "."));
    if (!Number.isFinite(importe) || importe < 0) {
      setError("Introduce un importe válido");
      return;
    }
    if (isFuel) {
      const litros = parseFloat(form.litros.replace(",", "."));
      if (!Number.isFinite(litros) || litros <= 0) {
        setError("Introduce los litros repostados");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          tipo: category.label,
          tipoId: category.id,
          importe,
          date: form.date,
          descripcion: form.descripcion || form.notas || "",
          referencia: isFuel ? form.estacion : "",
          litros: isFuel ? parseFloat(form.litros.replace(",", ".")) : null,
          km: form.km ? parseInt(form.km, 10) : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "No se pudo guardar el gasto");
      }
      handleClose();
      // Refresca los Server Components de la pantalla actual sin recargar.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el gasto");
    } finally {
      setSaving(false);
    }
  }

  // ── Paso 1: elegir tipo ─────────────────────────────────────────
  if (!category) {
    return (
      <AppModal open={open} onClose={handleClose} title="Añadir gasto">
        <h3 className="mb-4 text-title font-semibold text-text">¿Qué quieres añadir?</h3>
        <div className="grid grid-cols-2 gap-3">
          {SELECTABLE_CATEGORIES.map((c) => (
            <AppTypeTile
              key={c.id}
              icon={c.icon}
              label={c.label}
              accent={c.accent}
              onClick={() => setCategory(c)}
            />
          ))}
        </div>
      </AppModal>
    );
  }

  // ── Paso 2: formulario ──────────────────────────────────────────
  return (
    <AppModal
      open={open}
      onClose={handleClose}
      onBack={initialCategoryId ? undefined : () => setCategory(null)}
      title={category.label}
      footer={
        <AppButton size="lg" onClick={handleSave} loading={saving} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </AppButton>
      }
    >
      <div className="space-y-4">
        <AppDatePicker
          label="Fecha"
          value={form.date}
          onChange={(e) => set("date", e.target.value)}
        />

        {isFuel && (
          <AppInput
            label="Litros"
            inputMode="decimal"
            placeholder="0,00"
            suffix="L"
            value={form.litros}
            onChange={(e) => set("litros", e.target.value)}
          />
        )}

        <AppInput
          label="Importe"
          inputMode="decimal"
          placeholder="0,00"
          suffix="€"
          value={form.importe}
          onChange={(e) => set("importe", e.target.value)}
        />

        {isFuel && (
          <AppInput
            label="Precio por litro"
            computed
            tabIndex={-1}
            value={pricePerLiter != null ? `${formatCurrencyPrecise(pricePerLiter, 3)}/L` : "—"}
            hint="Se calcula a partir del importe y los litros."
            readOnly
          />
        )}

        <AppInput
          label="Kilómetros"
          inputMode="numeric"
          placeholder="0"
          suffix="km"
          value={form.km}
          onChange={(e) => set("km", e.target.value)}
        />

        {isFuel ? (
          stations.length > 0 ? (
            <AppSelect
              label="Estación de servicio"
              placeholder="Selecciona una estación"
              value={form.estacion}
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
              value={form.estacion}
              onChange={(e) => set("estacion", e.target.value)}
            />
          )
        ) : null}

        {isFuel && form.estacion === "__nueva__" && (
          <AppInput
            label="Nombre de la estación"
            placeholder="Repsol, Cepsa…"
            value=""
            onChange={(e) => set("estacion", e.target.value)}
            autoFocus
          />
        )}

        {!isFuel && (
          <AppInput
            label="Descripción"
            placeholder={`${category.label}…`}
            value={form.descripcion}
            onChange={(e) => set("descripcion", e.target.value)}
          />
        )}

        <AppTextarea
          label="Notas (opcional)"
          placeholder="Añadir nota…"
          value={form.notas}
          onChange={(e) => set("notas", e.target.value)}
        />

        {error && (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        )}
      </div>
    </AppModal>
  );
}
