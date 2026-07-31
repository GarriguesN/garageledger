"use client";

// Asistente de "Añadir vehículo" (mockup 1-4, 4 pasos).
//
//   Paso 1 · Marca y modelo
//     Chips de marcas recientes (BD) + buscador + lista popular.
//   Paso 2 · Especificaciones
//     Año, motor, combustible, transmisión, tracción.
//   Paso 3 · Identificación
//     Matrícula, VIN, kilometraje, toggle "predeterminado".
//   Paso 4 · Foto y resumen
//     Upload de foto + summary card con todo lo anterior.
//
// Sirve también para `src/app/coches/[id]/editar/page.tsx` con
// `mode="edit"`. La edición precarga valores y omite la subida de foto
// si no se cambia (la foto inicial se pasa por `initialPhotoId`).

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppCard, AppInput, AppSelect, AppDatePicker,
  Wizard, WizardSummaryCard,
  type WizardStep, type WizardErrors,
} from "@/components/ui";
import { colors, radius } from "@/design/tokens";
import { Car, Camera, Search } from "@/design/tokens/icons";

const COMBUSTIBLES = ["Gasolina", "Diésel", "Híbrido", "Eléctrico", "GLP"];
const TRANSMISIONES = ["Manual", "Automática"];
const TRACCIONES = ["Delantera", "Trasera", "Total"];

const POPULAR_BRANDS = [
  "Toyota", "BMW", "Mercedes-Benz", "Audi", "Honda", "Volkswagen",
];

export interface VehicleFormValues {
  marca: string;
  modelo: string;
  ano: string;
  motor: string;
  combustible: string;
  transmision: string;
  traccion: string;
  matricula: string;
  bastidor: string;
  km: string;
  fecha_matriculacion: string;
  /** Marca este coche como el predeterminado al volver al garaje. */
  predeterminado: boolean;
}

/** Foto pendiente de subir: si el usuario la cambia, subimos al final. */
interface PhotoState {
  file: File | null;
  previewUrl: string | null;
}

export interface VehicleWizardProps {
  mode: "create" | "edit";
  carId?: number;
  initialValues?: Partial<VehicleFormValues>;
  initialPhotoId?: number | null;
  /** Marcas ya existentes en el garaje (chips de "recientes"). */
  recentBrands?: string[];
  /** Cierra el wizard. Si no se da, navega hacia atrás. */
  onClose?: () => void;
}

const EMPTY: VehicleFormValues = {
  marca: "",
  modelo: "",
  ano: "",
  motor: "",
  combustible: "Gasolina",
  transmision: "Manual",
  traccion: "Delantera",
  matricula: "",
  bastidor: "",
  km: "",
  fecha_matriculacion: "",
  predeterminado: true,
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toIntOrNull(v: string): number | null {
  const n = Number.parseInt(v.trim(), 10);
  return Number.isFinite(n) ? n : null;
}

export default function VehicleWizard({
  mode,
  carId,
  initialValues,
  initialPhotoId,
  recentBrands = [],
  onClose,
}: VehicleWizardProps) {
  const router = useRouter();
  const [values, setValues] = useState<VehicleFormValues>({
    ...EMPTY,
    ...initialValues,
  });
  const [photo, setPhoto] = useState<PhotoState>({
    file: null,
    previewUrl: initialPhotoId ? `/api/attachments/${initialPhotoId}` : null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedCarId, setSavedCarId] = useState<number | null>(null);

  // La preview de la foto vive como ObjectURL; se libera al cambiar o
  // al desmontar para no dejar el blob en memoria.
  useEffect(() => {
    return () => {
      if (photo.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(photo.previewUrl);
    };
  }, [photo.previewUrl]);

  function setField<K extends keyof VehicleFormValues>(k: K, v: VehicleFormValues[K]) {
    setValues((p) => ({ ...p, [k]: v }));
  }

  function handleClose() {
    if (onClose) onClose();
    else router.back();
  }

  function choosePhoto(file: File | null) {
    if (photo.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(photo.previewUrl);
    if (!file) {
      setPhoto({
        file: null,
        previewUrl: initialPhotoId ? `/api/attachments/${initialPhotoId}` : null,
      });
      return;
    }
    setPhoto({ file, previewUrl: URL.createObjectURL(file) });
  }

  const suggestions = useMemo(() => {
    // Recientes primero, luego populares (sin duplicar).
    const seen = new Set<string>();
    const out: string[] = [];
    for (const b of recentBrands) {
      if (!seen.has(b)) { seen.add(b); out.push(b); }
    }
    for (const b of POPULAR_BRANDS) {
      if (!seen.has(b)) { seen.add(b); out.push(b); }
    }
    return out;
  }, [recentBrands]);

  const steps: WizardStep<VehicleFormValues>[] = [
    // ── Paso 1: Marca y modelo ────────────────────────────────────
    {
      id: "brand",
      title: "Marca y modelo",
      subtitle: "Selecciona la marca y el modelo de tu vehículo.",
      fields: ["marca", "modelo"],
      validate: (v) => {
        const errs: WizardErrors = {};
        if (!v.marca.trim()) errs.marca = "Elige la marca del vehículo";
        if (v.marca.trim() && !v.modelo.trim()) errs.modelo = "Indica el modelo";
        return errs;
      },
      render: (v, set, errors) => (
        <div className="space-y-4">
          <AppCard>
            <label className="mb-2 block text-caption font-medium text-text-secondary">
              Buscar marca
            </label>
            <div className="relative">
              <Search
                size={18}
                strokeWidth={1.75}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="BMW, Toyota, Honda…"
                value={v.marca}
                onChange={(e) => set("marca", e.target.value)}
                aria-invalid={errors.marca ? true : undefined}
                className="w-full min-h-12 rounded-input border border-border bg-surface-elevated pl-12 pr-4 text-body text-text outline-none transition-colors focus:border-primary"
              />
            </div>
            {errors.marca && (
              <p role="alert" className="mt-2 text-caption text-danger">{errors.marca}</p>
            )}
          </AppCard>

          {recentBrands.length > 0 && (
            <div>
              <p className="mb-2 text-caption font-medium text-text-secondary">Marcas recientes</p>
              <div className="flex flex-wrap gap-2">
                {recentBrands.slice(0, 4).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => set("marca", b)}
                    className="inline-flex items-center gap-2 rounded-chip border border-border bg-surface-elevated px-3 py-2 text-body text-text"
                  >
                    <Car size={16} strokeWidth={1.75} className="text-text-secondary" />
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-caption font-medium text-text-secondary">Marcas populares</p>
            <AppCard className="overflow-hidden p-0">
              <ul className="divide-y divide-border">
                {suggestions.filter((b) => !recentBrands.includes(b)).map((b) => (
                  <li key={b}>
                    <button
                      type="button"
                      onClick={() => set("marca", b)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-body text-text"
                    >
                      <Car size={18} strokeWidth={1.75} className="shrink-0 text-text-secondary" />
                      <span className="flex-1">{b}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </AppCard>
          </div>

          <AppInput
            label="Modelo"
            placeholder="Civic, Golf, Serie 3…"
            value={v.modelo}
            onChange={(e) => set("modelo", e.target.value)}
            error={errors.modelo}
          />
        </div>
      ),
    },

    // ── Paso 2: Especificaciones ──────────────────────────────────
    {
      id: "specs",
      title: "Especificaciones",
      subtitle: "Cuéntanos más sobre tu vehículo.",
      fields: [],
      render: (v, set) => (
        <AppCard>
          <div className="grid grid-cols-2 gap-3">
            <AppInput
              label="Año"
              inputMode="numeric"
              placeholder="2016"
              value={v.ano}
              onChange={(e) => set("ano", e.target.value)}
            />
            <AppInput
              label="Motor"
              placeholder="2.0 L · 184 CV"
              value={v.motor}
              onChange={(e) => set("motor", e.target.value)}
            />
            <AppSelect
              label="Combustible"
              value={v.combustible}
              onChange={(e) => set("combustible", e.target.value)}
              options={COMBUSTIBLES.map((c) => ({ value: c, label: c }))}
            />
            <AppSelect
              label="Transmisión"
              value={v.transmision}
              onChange={(e) => set("transmision", e.target.value)}
              options={TRANSMISIONES.map((c) => ({ value: c, label: c }))}
            />
            <AppSelect
              label="Tracción"
              value={v.traccion}
              onChange={(e) => set("traccion", e.target.value)}
              options={TRACCIONES.map((c) => ({ value: c, label: c }))}
            />
          </div>
        </AppCard>
      ),
    },

    // ── Paso 3: Identificación ────────────────────────────────────
    {
      id: "id",
      title: "Identificación",
      subtitle: "Añade los datos de identificación de tu vehículo.",
      fields: [],
      render: (v, set) => (
        <div className="space-y-4">
          <AppCard>
            <div className="space-y-4">
              <AppInput
                label="Matrícula"
                placeholder="0016GMP"
                value={v.matricula}
                onChange={(e) => set("matricula", e.target.value.toUpperCase())}
              />
              <AppInput
                label="Número VIN"
                placeholder="WAUZZZ8V5GA123456"
                value={v.bastidor}
                onChange={(e) => set("bastidor", e.target.value.toUpperCase())}
              />
              <AppInput
                label="Kilometraje actual"
                inputMode="numeric"
                placeholder="132.870"
                suffix="km"
                value={v.km}
                onChange={(e) => set("km", e.target.value)}
              />
              <AppDatePicker
                label="Fecha de matriculación"
                value={v.fecha_matriculacion || todayIso()}
                onChange={(e) => set("fecha_matriculacion", e.target.value)}
              />
            </div>
          </AppCard>
          <AppCard>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={v.predeterminado}
                onChange={(e) => set("predeterminado", e.target.checked)}
                className="size-5 accent-primary"
              />
              <span className="text-body text-text">Establecer como predeterminado</span>
            </label>
          </AppCard>
        </div>
      ),
    },

    // ── Paso 4: Foto y resumen ────────────────────────────────────
    {
      id: "photo",
      title: "Foto del vehículo",
      subtitle: "Añade una foto y revisa el resumen.",
      fields: [],
      render: (v, _set, _errors) => (
        <div className="space-y-4">
          <AppCard>
            <div
              className="relative aspect-video w-full overflow-hidden"
              style={{ borderRadius: radius.image, backgroundColor: colors.surfaceElevated }}
            >
              {photo.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.previewUrl}
                  alt="Foto del vehículo"
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full flex-col items-center justify-center text-text-secondary">
                  <Camera size={40} strokeWidth={1.5} aria-hidden="true" />
                  <span className="mt-2 text-caption">Sube una foto para reconocerlo mejor</span>
                </div>
              )}
            </div>
            <label className="mt-3 flex min-h-11 items-center">
              <span className="sr-only">Elegir foto del vehículo</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => choosePhoto(e.target.files?.[0] ?? null)}
                className="block min-h-11 w-full text-caption text-text-secondary file:mr-3 file:min-h-11 file:rounded-pill file:border-0 file:bg-surface-elevated file:px-4 file:text-caption file:font-semibold file:text-text"
              />
            </label>
          </AppCard>

          <WizardSummaryCard
            title="Resumen"
            items={[
              { label: "Vehículo", value: `${v.marca} ${v.modelo}`.trim() || "—" },
              { label: "Año", value: v.ano || "—" },
              { label: "Motor", value: v.motor || "—" },
              { label: "Combustible", value: v.combustible },
              { label: "Transmisión", value: v.transmision },
              { label: "Tracción", value: v.traccion },
              { label: "Matrícula", value: v.matricula || "—" },
              { label: "VIN", value: v.bastidor || "—" },
              { label: "Kilometraje", value: v.km ? `${v.km} km` : "—" },
            ]}
          />
        </div>
      ),
    },
  ];

  async function uploadPhoto(id: number): Promise<number | null> {
    if (!photo.file) return null;
    const fd = new FormData();
    fd.append("car_id", String(id));
    fd.append("file", photo.file);
    const res = await fetch("/api/attachments", { method: "POST", body: fd });
    if (!res.ok) return null;
    const json = await res.json();
    return json.id as number;
  }

  async function handleSubmit(): Promise<boolean> {
    setSubmitting(true);
    try {
      const payload = {
        marca: values.marca.trim(),
        modelo: values.modelo.trim(),
        ano: toIntOrNull(values.ano),
        motor: values.motor.trim(),
        combustible: values.combustible,
        transmision: values.transmision,
        traccion: values.traccion,
        matricula: values.matricula.trim(),
        bastidor: values.bastidor.trim(),
        km: toIntOrNull(values.km) ?? 0,
        km_actuales: toIntOrNull(values.km) ?? 0,
        fecha_matriculacion: values.fecha_matriculacion || null,
        predeterminado: values.predeterminado,
      };

      let id: number;
      if (mode === "create") {
        const res = await fetch("/api/cars", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("No se ha podido crear el vehículo");
        const car = await res.json();
        id = car.id as number;
        const fotoId = await uploadPhoto(id);
        if (fotoId != null) {
          await fetch("/api/cars", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, foto_attachment_id: fotoId }),
          });
        }
      } else {
        if (carId == null) throw new Error("Falta el id del vehículo");
        id = carId;
        const fotoId = await uploadPhoto(id);
        const res = await fetch("/api/cars", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            ...payload,
            ...(fotoId != null ? { foto_attachment_id: fotoId } : {}),
          }),
        });
        if (!res.ok) throw new Error("No se han podido guardar los cambios");
      }
      setSavedCarId(id);
      setShowSuccess(true);
      return true;
    } catch {
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-background">
      <Wizard
        steps={steps}
        values={values}
        onChange={setValues}
        nextLabel="Siguiente"
        submitLabel={mode === "create" ? "Guardar vehículo" : "Guardar cambios"}
        cancelLabel="Cancelar"
        backLabel="Atrás"
        submitting={submitting}
        onSubmit={handleSubmit}
        onClose={handleClose}
        success={{
          show: showSuccess,
          subtitle: mode === "create" ? "Vehículo guardado correctamente" : "Cambios guardados correctamente",
          highlight: `${values.marca} ${values.modelo}`.trim() || "Vehículo",
          detail: values.km ? `${values.km} km` : undefined,
          primary: {
            label: "Ver en garaje",
            onClick: () => {
              setShowSuccess(false);
              router.push(savedCarId ? `/coches/${savedCarId}` : "/");
            },
          },
          secondary: {
            label: "Añadir otro vehículo",
            onClick: () => {
              setShowSuccess(false);
              setValues({ ...EMPTY });
              setPhoto({ file: null, previewUrl: null });
              router.refresh();
            },
          },
        }}
      />
    </div>
  );
}

// Unused but kept for clarity (no-op for now). Removes an unused-import warning
// if the consumer opts to use AppTypeTile for the brand icons later.
