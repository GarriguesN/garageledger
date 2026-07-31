"use client";

// Formulario de vehículo, compartido por alta y edición.
//
// Antes eran dos archivos de ~400 líneas casi idénticos, con los mismos
// campos escritos dos veces; cualquier cambio había que hacerlo en ambos y
// era cuestión de tiempo que se separaran. Aquí solo cambian el título, el
// método (POST/PUT) y de dónde salen los valores iniciales.
//
// Orden de guardado en el alta: primero se crea el coche, luego se sube la
// foto (necesita car_id) y por último se enlaza. No se puede hacer en otro
// orden porque un adjunto sin coche no tiene dónde colgarse.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppCard, AppSection, AppInput, AppSelect, AppDatePicker, AppButton, AppToast,
} from "@/components/ui";
import { useToast } from "@/components/ui/AppToast";
import { colors, hexToRgba, radius } from "@/design/tokens";
import { Car as CarIcon } from "@/design/tokens/icons";

const COMBUSTIBLES = ["Gasolina", "Diésel", "Híbrido", "Eléctrico", "GLP"];

export interface CarFormValues {
  marca: string; modelo: string; generacion: string; motor: string;
  ano: string; puertas: string; km: string;
  fecha_matriculacion: string; km_origen: string;
  matricula: string; bastidor: string; combustible: string;
  potencia_cv: string; cilindrada_cc: string; peso_kg: string;
  plazas: string; color: string;
  fecha_ivtm: string; fecha_ultima_itv: string; fecha_vencimiento_seguro: string;
}

export const EMPTY_CAR_FORM: CarFormValues = {
  marca: "", modelo: "", generacion: "", motor: "",
  ano: "", puertas: "5", km: "",
  fecha_matriculacion: "", km_origen: "matriculacion",
  matricula: "", bastidor: "", combustible: "Gasolina",
  potencia_cv: "", cilindrada_cc: "", peso_kg: "",
  plazas: "", color: "",
  fecha_ivtm: "", fecha_ultima_itv: "", fecha_vencimiento_seguro: "",
};

export interface CarFormProps {
  mode: "create" | "edit";
  carId?: number;
  initialValues?: CarFormValues;
  /** Foto ya guardada, para poder enseñarla y saber si hay que sustituirla. */
  initialPhotoId?: number | null;
}

const toInt = (v: string) => (v.trim() === "" ? null : Number.parseInt(v, 10));

export default function CarForm({
  mode, carId, initialValues, initialPhotoId = null,
}: CarFormProps) {
  const router = useRouter();
  const { toast, show, dismiss } = useToast();

  const [form, setForm] = useState<CarFormValues>(initialValues ?? EMPTY_CAR_FORM);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialPhotoId ? `/api/attachments/${initialPhotoId}` : null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Las URL de objeto de la previsualización se revocan al cambiar de foto y
  // al desmontar; si no, cada foto elegida deja su copia en memoria.
  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function set<K extends keyof CarFormValues>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  function choosePhoto(file: File | null) {
    if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(
      file ? URL.createObjectURL(file) : initialPhotoId ? `/api/attachments/${initialPhotoId}` : null,
    );
  }

  function payload() {
    return {
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      generacion: form.generacion.trim(),
      motor: form.motor.trim(),
      ano: toInt(form.ano),
      puertas: toInt(form.puertas) ?? 5,
      km: toInt(form.km) ?? 0,
      km_actuales: toInt(form.km) ?? 0,
      fecha_matriculacion: form.fecha_matriculacion || null,
      km_origen: form.km_origen || "matriculacion",
      fecha_ivtm: form.fecha_ivtm || null,
      fecha_ultima_itv: form.fecha_ultima_itv || null,
      fecha_vencimiento_seguro: form.fecha_vencimiento_seguro || null,
      potencia_cv: toInt(form.potencia_cv),
      cilindrada_cc: toInt(form.cilindrada_cc),
      peso_kg: toInt(form.peso_kg),
      plazas: toInt(form.plazas),
      color: form.color.trim() || null,
      matricula: form.matricula.trim(),
      bastidor: form.bastidor.trim(),
      combustible: form.combustible,
    };
  }

  async function uploadPhoto(id: number): Promise<number | null> {
    if (!photo) return null;
    const fd = new FormData();
    fd.append("car_id", String(id));
    fd.append("file", photo);
    const res = await fetch("/api/attachments", { method: "POST", body: fd });
    if (!res.ok) return null;
    const json = await res.json();
    return json.id as number;
  }

  async function submit() {
    if (!form.marca.trim() || !form.modelo.trim()) {
      setError("La marca y el modelo son obligatorios");
      return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        const res = await fetch("/api/cars", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload()),
        });
        if (!res.ok) throw new Error("No se ha podido crear el vehículo");
        const car = await res.json();

        const fotoId = await uploadPhoto(car.id);
        if (fotoId != null) {
          await fetch("/api/cars", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: car.id, foto_attachment_id: fotoId }),
          });
        }
        router.push(`/coches/${car.id}`);
      } else {
        const fotoId = await uploadPhoto(carId!);
        const res = await fetch("/api/cars", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: carId,
            ...payload(),
            ...(fotoId != null ? { foto_attachment_id: fotoId } : {}),
          }),
        });
        if (!res.ok) throw new Error("No se han podido guardar los cambios");
        router.push(`/coches/${carId}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido guardar");
      show("No se ha podido guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <AppSection title="Identificación">
        <AppCard>
          <div className="grid grid-cols-2 gap-3">
            <AppInput label="Marca *" placeholder="Honda" value={form.marca}
              onChange={(e) => set("marca", e.target.value)} />
            <AppInput label="Modelo *" placeholder="Civic" value={form.modelo}
              onChange={(e) => set("modelo", e.target.value)} />
            <AppInput label="Generación" placeholder="FK2" value={form.generacion}
              onChange={(e) => set("generacion", e.target.value)} />
            <AppInput label="Motor" placeholder="1.8 i-VTEC" value={form.motor}
              onChange={(e) => set("motor", e.target.value)} />
            <AppInput label="Matrícula" placeholder="1234-ABC" value={form.matricula}
              onChange={(e) => set("matricula", e.target.value)} />
            <AppInput label="Bastidor (VIN)" placeholder="JHMFB4600CS123456" value={form.bastidor}
              onChange={(e) => set("bastidor", e.target.value)} />
          </div>
        </AppCard>
      </AppSection>

      <AppSection title="Kilometraje">
        <AppCard>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <AppInput label="Año" inputMode="numeric" placeholder="2009" value={form.ano}
                onChange={(e) => set("ano", e.target.value)} />
              <AppInput label="Kilómetros" inputMode="numeric" suffix="km" value={form.km}
                onChange={(e) => set("km", e.target.value)} />
            </div>

            <AppDatePicker
              label="Fecha de matriculación"
              value={form.fecha_matriculacion}
              onChange={(e) => set("fecha_matriculacion", e.target.value)}
            />

            <AppSelect
              label="Contar la media de km desde"
              value={form.km_origen}
              onChange={(e) => set("km_origen", e.target.value)}
              options={[
                { value: "matriculacion", label: "La fecha de matriculación" },
                { value: "primer_registro", label: "El primer registro con km" },
              ]}
            />
            <p className="text-caption text-text-muted">
              {form.km_origen === "matriculacion"
                ? form.fecha_matriculacion
                  ? "La media mensual se calcula repartiendo los km totales desde esa fecha."
                  : "Rellena la fecha de matriculación o la media no se podrá calcular."
                : "La media se cuenta desde tu primer gasto con kilómetros. Útil si no conoces la fecha de matriculación."}
            </p>
          </div>
        </AppCard>
      </AppSection>

      <AppSection title="Fechas legales">
        <AppCard>
          <div className="space-y-4">
            <AppDatePicker label="Última ITV" value={form.fecha_ultima_itv}
              onChange={(e) => set("fecha_ultima_itv", e.target.value)} />
            <AppDatePicker label="Vencimiento del seguro" value={form.fecha_vencimiento_seguro}
              onChange={(e) => set("fecha_vencimiento_seguro", e.target.value)} />
            <AppDatePicker label="Último pago del IVTM" value={form.fecha_ivtm}
              onChange={(e) => set("fecha_ivtm", e.target.value)} />
            <p className="text-caption text-text-muted">
              Los plazos municipales del IVTM varían (lo más común, entre mayo y junio). Se usa
              para avisarte antes de que caduque.
            </p>
          </div>
        </AppCard>
      </AppSection>

      <AppSection title="Datos técnicos">
        <AppCard>
          <div className="grid grid-cols-2 gap-3">
            <AppSelect label="Combustible" value={form.combustible}
              onChange={(e) => set("combustible", e.target.value)}
              options={COMBUSTIBLES.map((c) => ({ value: c, label: c }))} />
            <AppInput label="Puertas" inputMode="numeric" value={form.puertas}
              onChange={(e) => set("puertas", e.target.value)} />
            <AppInput label="Potencia" inputMode="numeric" suffix="CV" placeholder="140"
              value={form.potencia_cv} onChange={(e) => set("potencia_cv", e.target.value)} />
            <AppInput label="Cilindrada" inputMode="numeric" suffix="cc" placeholder="1800"
              value={form.cilindrada_cc} onChange={(e) => set("cilindrada_cc", e.target.value)} />
            <AppInput label="Peso" inputMode="numeric" suffix="kg" placeholder="1320"
              value={form.peso_kg} onChange={(e) => set("peso_kg", e.target.value)} />
            <AppInput label="Plazas" inputMode="numeric" placeholder="5"
              value={form.plazas} onChange={(e) => set("plazas", e.target.value)} />
          </div>
          <AppInput className="mt-3" label="Color" placeholder="Negro metalizado"
            value={form.color} onChange={(e) => set("color", e.target.value)} />
        </AppCard>
      </AppSection>

      <AppSection title="Foto">
        <AppCard>
          <div
            className="relative aspect-video w-full overflow-hidden"
            style={{ borderRadius: radius.image, backgroundColor: colors.surfaceElevated }}
          >
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Foto del vehículo" className="size-full object-cover" />
            ) : (
              <div
                className="flex size-full items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${hexToRgba(colors.primary, 0.18)}, ${colors.surfaceElevated})`,
                }}
              >
                <CarIcon size={40} className="text-text-muted" aria-hidden="true" />
              </div>
            )}
          </div>

          {/* El control nativo mide 32px de alto, por debajo del área táctil
              mínima; min-h-11 lo lleva a 44 y el botón interno se centra. */}
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
      </AppSection>

      {error && (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}

      <AppButton size="lg" onClick={submit} loading={saving} disabled={saving}>
        {saving ? "Guardando…" : mode === "create" ? "Guardar vehículo" : "Guardar cambios"}
      </AppButton>

      <AppToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
