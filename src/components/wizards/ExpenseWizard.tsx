"use client";

// Asistente de gasto (mockups 5-7) con su rama de repostaje (8-10).
//
// Paso 1  tipo de gasto — rejilla de categorías.
// Luego, según el tipo:
//   combustible → cantidad y precio · detalles del repostaje
//   el resto    → detalles del gasto · comprobante
// Y siempre termina en el resumen.
//
// El precio por litro no se guarda: se calcula al vuelo desde importe y
// litros. Guardar un valor derivado es pedir que un día no cuadre con sus
// dos factores.
//
// Es un sheet y no una ruta: el mockup lo cierra con una ✕ y un gasto a
// medias no debería sobrevivir a un refresco.

import { useRouter } from "next/navigation";
import {
  AppInput, AppTextarea, AppSelect, AppDatePicker, AppTypeTile,
} from "@/components/ui";
import { Wizard, FormSection, SummaryStep, type WizardStepDef } from "@/components/wizard";
import ImageUploadStep from "@/components/wizard/ImageUploadStep";
import {
  SELECTABLE_CATEGORIES, EXPENSE_CATEGORY_MAP, type ExpenseCategory,
} from "@/lib/expenses/categories";
import { PAYMENT_METHODS } from "@/lib/expenses/options";
import { formatCurrencyPrecise, formatDate, formatKm, formatLiters } from "@/lib/format";
import { errorFrom, parseDecimal, parseWhole, todayIso, uploadAttachment } from "./shared";

export interface ExpenseWizardProps {
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
  /** Ruta del asistente de mantenimiento. Si se pasa, la rejilla de tipos
   *  ofrece además "Recordatorio": no es un gasto —no se apunta lo pagado,
   *  se programa lo que falta— y por eso sale de este asistente en vez de
   *  ser una categoría más. */
  reminderHref?: string;
  /** Gasto existente: el asistente pasa a modo edición (PUT en vez de POST)
   *  y arranca con sus valores. El tipo sigue siendo editable —un gasto mal
   *  clasificado se arregla aquí. */
  expense?: {
    id: number;
    tipoId: string;
    importe: number;
    litros: number | null;
    km: number | null;
    referencia: string;
    descripcion: string;
    metodoPago: string | null;
    date: string;
  };
}

interface ExpenseValues {
  categoryId: string;
  importe: string;
  litros: string;
  km: string;
  estacion: string;
  metodoPago: string;
  descripcion: string;
  notas: string;
  date: string;
  receipt: File | null;
}

const categoryOf = (id: string): ExpenseCategory | null => EXPENSE_CATEGORY_MAP[id] ?? null;
const isFuel = (v: ExpenseValues) => categoryOf(v.categoryId)?.form === "fuel";

function pricePerLiter(v: ExpenseValues): number | null {
  const importe = parseDecimal(v.importe);
  const litros = parseDecimal(v.litros);
  if (importe == null || litros == null || litros <= 0) return null;
  return importe / litros;
}

export default function ExpenseWizard({
  open, onClose, carId, currentKm, stations, initialCategoryId,
  reminderHref, expense,
}: ExpenseWizardProps) {
  const router = useRouter();
  const editing = !!expense;

  const initialValues: ExpenseValues = expense
    ? {
        categoryId: expense.tipoId,
        importe: String(expense.importe),
        litros: expense.litros != null ? String(expense.litros) : "",
        km: expense.km != null ? String(expense.km) : "",
        estacion: expense.referencia,
        metodoPago: expense.metodoPago ?? PAYMENT_METHODS[0],
        descripcion: expense.descripcion,
        notas: "",
        date: expense.date,
        receipt: null,
      }
    : {
        categoryId: initialCategoryId && categoryOf(initialCategoryId) ? initialCategoryId : "",
        importe: "",
        litros: "",
        km: currentKm > 0 ? String(currentKm) : "",
        estacion: "",
        metodoPago: PAYMENT_METHODS[0],
        descripcion: "",
        notas: "",
        date: todayIso(),
        receipt: null,
      };

  const steps: WizardStepDef<ExpenseValues>[] = [
    {
      id: "tipo",
      title: "¿Qué tipo de gasto es?",
      subtitle: "Selecciona la categoría que mejor describe el gasto",
      validate: (v) => (v.categoryId ? {} : { categoryId: "Elige un tipo de gasto" }),
      render: ({ values, pick, errors }) => (
        <>
          {/* Elegir categoría es todo lo que este paso pide: al tocarla se
              avanza sola, sin pedir un "Siguiente" que no decide nada. */}
          <div role="radiogroup" aria-label="Tipo de gasto" className="grid grid-cols-2 gap-3">
            {SELECTABLE_CATEGORIES.map((c) => (
              <AppTypeTile
                key={c.id}
                icon={c.icon}
                label={c.label}
                accent={c.accent}
                selected={values.categoryId === c.id}
                onClick={() => pick({ categoryId: c.id })}
              />
            ))}
          </div>
          {errors.categoryId && (
            <p role="alert" className="mt-3 text-caption text-danger">
              {errors.categoryId}
            </p>
          )}

          {/* Un recordatorio no es un gasto: no se apunta lo que se ha
              pagado, se programa lo que falta por hacer. Va aparte de la
              rejilla y con su propio rótulo para que no parezca una
              categoría más, y lleva al asistente de mantenimiento.
              Editando un gasto no aparece: ahí solo se cambia su tipo. */}
          {!editing && reminderHref && (
            <>
              <p className="mt-6 text-caption text-text-secondary">
                O programa algo para más adelante
              </p>
              <div className="mt-3">
                <AppTypeTile
                  icon="calendar"
                  label="Recordatorio"
                  accent="blue"
                  href={reminderHref}
                  className="w-full"
                />
              </div>
            </>
          )}
        </>
      ),
    },

    // ── Rama de combustible ──────────────────────────────────────
    {
      id: "repostaje-cantidad",
      title: "Cantidad y precio",
      subtitle: "Introduce los datos del repostaje",
      when: isFuel,
      validate: (v) => {
        const errors: Record<string, string> = {};
        const litros = parseDecimal(v.litros);
        if (litros == null || litros <= 0) errors.litros = "Introduce los litros repostados";
        const importe = parseDecimal(v.importe);
        if (importe == null || importe < 0) errors.importe = "Introduce un importe válido";
        return errors;
      },
      render: ({ values, set, errors, fieldRef }) => (
        <FormSection>
          <AppInput
            ref={fieldRef("litros")}
            label="Litros"
            inputMode="decimal"
            placeholder="0,00"
            suffix="L"
            value={values.litros}
            error={errors.litros}
            onChange={(e) => set("litros", e.target.value)}
          />
          <AppInput
            ref={fieldRef("importe")}
            label="Importe total"
            inputMode="decimal"
            placeholder="0,00"
            suffix="€"
            value={values.importe}
            error={errors.importe}
            onChange={(e) => set("importe", e.target.value)}
          />
          <AppInput
            label="Precio por litro"
            computed
            tabIndex={-1}
            value={
              pricePerLiter(values) != null
                ? `${formatCurrencyPrecise(pricePerLiter(values)!, 3)}/L`
                : "—"
            }
            hint="Se calcula a partir del importe y los litros."
            readOnly
          />
        </FormSection>
      ),
    },
    {
      id: "repostaje-detalles",
      title: "Detalles adicionales",
      subtitle: "Completa la información del repostaje",
      when: isFuel,
      validate: (v) => (v.km && parseWhole(v.km) == null ? { km: "Kilometraje no válido" } : {}),
      render: ({ values, set, errors, fieldRef }) => (
        <FormSection>
          {stations.length > 0 ? (
            <AppSelect
              label="Gasolinera"
              placeholder="Selecciona una estación"
              value={values.estacion}
              onChange={(e) => set("estacion", e.target.value)}
              options={stations.map((s) => ({ value: s, label: s }))}
            />
          ) : (
            <AppInput
              label="Gasolinera"
              placeholder="Repsol, Cepsa…"
              value={values.estacion}
              onChange={(e) => set("estacion", e.target.value)}
            />
          )}
          <AppDatePicker
            label="Fecha"
            value={values.date}
            onChange={(e) => set("date", e.target.value)}
          />
          <AppInput
            ref={fieldRef("km")}
            label="Kilometraje"
            inputMode="numeric"
            placeholder="0"
            suffix="km"
            value={values.km}
            error={errors.km}
            onChange={(e) => set("km", e.target.value)}
          />
        </FormSection>
      ),
    },

    // ── Rama genérica ────────────────────────────────────────────
    {
      id: "gasto-detalles",
      title: "Detalles del gasto",
      subtitle: "Añade la información principal",
      when: (v) => !isFuel(v),
      validate: (v) => {
        const errors: Record<string, string> = {};
        const importe = parseDecimal(v.importe);
        if (importe == null || importe < 0) errors.importe = "Introduce un importe válido";
        if (v.km && parseWhole(v.km) == null) errors.km = "Kilometraje no válido";
        return errors;
      },
      render: ({ values, set, errors, fieldRef }) => (
        <FormSection>
          <AppInput
            ref={fieldRef("importe")}
            label="Importe"
            inputMode="decimal"
            placeholder="0,00"
            suffix="€"
            value={values.importe}
            error={errors.importe}
            onChange={(e) => set("importe", e.target.value)}
          />
          <AppDatePicker
            label="Fecha"
            value={values.date}
            onChange={(e) => set("date", e.target.value)}
          />
          <AppInput
            label="Descripción"
            placeholder={`${categoryOf(values.categoryId)?.label ?? "Gasto"}…`}
            value={values.descripcion}
            onChange={(e) => set("descripcion", e.target.value)}
          />
          <AppSelect
            label="Método de pago"
            value={values.metodoPago}
            onChange={(e) => set("metodoPago", e.target.value)}
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
          />
          <AppInput
            ref={fieldRef("km")}
            label="Kilómetros"
            inputMode="numeric"
            placeholder="0"
            suffix="km"
            value={values.km}
            error={errors.km}
            onChange={(e) => set("km", e.target.value)}
          />
        </FormSection>
      ),
    },
    {
      id: "gasto-comprobante",
      title: "Comprobante (opcional)",
      subtitle: "Añade el ticket o una nota adicional",
      when: (v) => !isFuel(v),
      render: ({ values, set }) => (
        <FormSection>
          <ImageUploadStep
            label="Foto del ticket"
            title="Subir foto"
            hint="Formatos: JPG, PNG"
            aspect="auto"
            file={values.receipt}
            onSelect={(file) => set("receipt", file)}
            onRemove={() => set("receipt", null)}
          />
          <AppTextarea
            label="Notas adicionales"
            placeholder="Ej. Detalle del servicio…"
            value={values.notas}
            onChange={(e) => set("notas", e.target.value)}
          />
        </FormSection>
      ),
    },

    // ── Resumen ──────────────────────────────────────────────────
    {
      id: "resumen",
      title: (v) => (isFuel(v) ? "Resumen del repostaje" : "Resumen del gasto"),
      subtitle: (v) => (isFuel(v) ? "Revisa y guarda el repostaje" : "Revisa y guarda el gasto"),
      nextLabel: (v) => (isFuel(v) ? "Guardar repostaje" : "Guardar gasto"),
      render: ({ values, goTo }) => {
        const category = categoryOf(values.categoryId);
        const fuel = isFuel(values);
        const ppl = pricePerLiter(values);
        const km = parseWhole(values.km);
        return (
          <SummaryStep
            onEdit={goTo}
            groups={[
              {
                icon: category?.icon,
                accent: category?.accent,
                title: category?.label,
                subtitle: formatDate(values.date),
                editStepId: fuel ? "repostaje-cantidad" : "gasto-detalles",
                rows: fuel
                  ? [
                      // En el resumen y en el éxito el importe va con
                      // céntimos: es la cifra que se está confirmando, no un
                      // dato de lista donde el céntimo sobra.
                      { label: "Importe total", value: formatCurrencyPrecise(parseDecimal(values.importe) ?? 0), emphasis: true },
                      { label: "Litros", value: formatLiters(parseDecimal(values.litros)) },
                      { label: "Precio por litro", value: ppl != null ? `${formatCurrencyPrecise(ppl, 3)}/L` : "—" },
                    ]
                  : [
                      { label: "Importe", value: formatCurrencyPrecise(parseDecimal(values.importe) ?? 0), emphasis: true },
                      { label: "Descripción", value: values.descripcion || "—" },
                      { label: "Método de pago", value: values.metodoPago },
                    ],
              },
              {
                title: fuel ? "Repostaje" : "Detalles",
                editStepId: fuel ? "repostaje-detalles" : "gasto-comprobante",
                rows: fuel
                  ? [
                      { label: "Gasolinera", value: values.estacion || "—" },
                      { label: "Kilometraje", value: km != null ? formatKm(km) : "—" },
                    ]
                  : [
                      { label: "Kilómetros", value: km != null ? formatKm(km) : "—" },
                      { label: "Comprobante", value: values.receipt ? "Adjunto" : "—" },
                      { label: "Notas", value: values.notas || "—" },
                    ],
              },
            ]}
          />
        );
      },
    },
  ];

  async function submit(values: ExpenseValues) {
    const category = categoryOf(values.categoryId)!;
    const fuel = category.form === "fuel";
    const importe = parseDecimal(values.importe) ?? 0;
    const km = parseWhole(values.km);

    const payload = {
      carId,
      tipo: category.label,
      tipoId: category.id,
      importe,
      date: values.date,
      descripcion: values.descripcion || values.notas || "",
      referencia: fuel ? values.estacion : "",
      litros: fuel ? parseDecimal(values.litros) : null,
      km,
      metodoPago: fuel ? null : values.metodoPago,
    };

    // Editar usa PUT sobre el mismo id; crear, POST. El resto del asistente
    // es idéntico: los mismos pasos y las mismas validaciones.
    const res = await fetch(
      editing ? `/api/expenses?id=${expense!.id}` : "/api/expenses",
      {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: expense!.id, ...payload } : payload),
      },
    );
    if (!res.ok) throw await errorFrom(res, "No se pudo guardar el gasto");
    const saved = await res.json();

    // El ticket se sube después: necesita el id del gasto para colgarse de
    // él. Si falla, el gasto ya está guardado y no se pierde.
    if (values.receipt) {
      await uploadAttachment(carId, values.receipt, {
        filename: values.receipt.name,
        expenseId: saved.id,
      });
    }

    // Refresca los Server Components de la pantalla actual sin recargar.
    router.refresh();

    return {
      message: editing
        ? "Gasto actualizado correctamente"
        : fuel ? "Repostaje guardado correctamente" : "Gasto guardado correctamente",
      headline: formatCurrencyPrecise(importe),
      detail: fuel
        ? `${formatLiters(parseDecimal(values.litros))} · ${values.estacion || category.label}`
        : values.descripcion || category.label,
      meta: formatDate(values.date),
      primaryLabel: editing ? "Hecho" : "Ver en actividad",
      onPrimary: () => {
        onClose();
        if (!editing) router.push(`/coches/${carId}/actividad`);
      },
      secondaryLabel: editing
        ? undefined
        : fuel ? "Añadir otro repostaje" : "Añadir otro gasto",
    };
  }

  return (
    <Wizard
      open={open}
      title={(v) =>
        editing ? "Editar gasto" : isFuel(v) ? "Añadir combustible" : "Añadir gasto"
      }
      steps={steps}
      initialValues={initialValues}
      initialStepId={initialValues.categoryId ? firstStepFor(initialValues) : undefined}
      submitLabel={editing ? "Guardar cambios" : "Guardar gasto"}
      onSubmit={submit}
      onClose={onClose}
    />
  );
}

/** Con la categoría ya elegida (accesos rápidos del resumen del vehículo),
 *  el paso 1 no tiene nada que preguntar: se entra directamente en el
 *  primer paso de su rama. */
function firstStepFor(values: ExpenseValues): string {
  return isFuel(values) ? "repostaje-cantidad" : "gasto-detalles";
}
