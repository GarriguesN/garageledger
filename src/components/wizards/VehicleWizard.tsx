"use client";

// Asistente de vehículo (mockups 1-4), compartido por alta y edición: los
// mismos pasos, los mismos campos y el mismo orden. Lo único que cambia es
// de dónde salen los valores iniciales y si guarda con POST o con PUT.
//
// El mockup describe cuatro pasos (marca y modelo · especificaciones ·
// identificación · foto y resumen). Esta app guarda además la ficha técnica
// completa y las fechas legales del coche, que no caben en esos cuatro sin
// convertirlos en el formulario largo del que veníamos: van en dos pasos
// más, con la misma estructura. Se mantiene la regla —una tarea por paso—
// que es lo que hace que el patrón funcione.
//
// Orden de guardado en el alta: primero se crea el coche, luego se sube la
// foto (necesita car_id) y por último se enlaza. No se puede hacer en otro
// orden porque un adjunto sin coche no tiene dónde colgarse.

import { useRouter } from "next/navigation";
import { AppInput, AppSelect, AppDatePicker, AppSearchSelect } from "@/components/ui";
import { Wizard, FormSection, SummaryStep, type WizardStepDef } from "@/components/wizard";
import ImageUploadStep from "@/components/wizard/ImageUploadStep";
import {
  DRIVETRAINS, FUEL_TYPES, POPULAR_BRANDS, TRANSMISSIONS, vehicleYears,
} from "@/lib/vehicles/catalog";
import { formatDate, formatKm } from "@/lib/format";
import { errorFrom, parseWhole, uploadAttachment } from "./shared";

export interface VehicleValues {
  marca: string; modelo: string; generacion: string; motor: string;
  ano: string; combustible: string; transmision: string; traccion: string;
  potencia_cv: string; cilindrada_cc: string; peso_kg: string;
  puertas: string; plazas: string; color: string;
  matricula: string; bastidor: string; km: string;
  fecha_matriculacion: string; km_origen: string;
  fecha_ultima_itv: string; fecha_vencimiento_seguro: string; fecha_ivtm: string;
  foto: File | null;
}

export const EMPTY_VEHICLE: VehicleValues = {
  marca: "", modelo: "", generacion: "", motor: "",
  ano: "", combustible: "Gasolina", transmision: "", traccion: "",
  potencia_cv: "", cilindrada_cc: "", peso_kg: "",
  puertas: "5", plazas: "", color: "",
  matricula: "", bastidor: "", km: "",
  fecha_matriculacion: "", km_origen: "matriculacion",
  fecha_ultima_itv: "", fecha_vencimiento_seguro: "", fecha_ivtm: "",
  foto: null,
};

export interface VehicleWizardProps {
  mode: "create" | "edit";
  carId?: number;
  initialValues?: VehicleValues;
  /** Foto ya guardada, para poder enseñarla y saber si hay que sustituirla. */
  initialPhotoId?: number | null;
  /** Marcas que ya hay en el garaje: son las que más probablemente se
   *  repitan, así que van como chips de acceso directo. */
  recentBrands?: string[];
}

const toNull = (v: string) => (v.trim() === "" ? null : v.trim());

export default function VehicleWizard({
  mode, carId, initialValues, initialPhotoId = null, recentBrands = [],
}: VehicleWizardProps) {
  const router = useRouter();
  const initial = initialValues ?? EMPTY_VEHICLE;
  const backHref = mode === "edit" && carId ? `/coches/${carId}` : "/";

  const steps: WizardStepDef<VehicleValues>[] = [
    {
      id: "marca-modelo",
      title: "Marca y modelo",
      subtitle: "Selecciona la marca y el modelo de tu vehículo",
      validate: (v) => {
        const errors: Record<string, string> = {};
        if (!v.marca.trim()) errors.marca = "La marca es obligatoria";
        if (!v.modelo.trim()) errors.modelo = "El modelo es obligatorio";
        return errors;
      },
      render: ({ values, set, errors, fieldRef }) => (
        <FormSection>
          <AppSearchSelect
            inputRef={fieldRef("marca")}
            label="Marca"
            value={values.marca}
            onChange={(v) => set("marca", v)}
            options={POPULAR_BRANDS}
            recent={recentBrands}
            recentLabel="Marcas recientes"
            optionsLabel="Marcas populares"
            placeholder="Buscar marca"
            error={errors.marca}
          />
          <AppInput
            ref={fieldRef("modelo")}
            label="Modelo"
            placeholder="Civic"
            value={values.modelo}
            error={errors.modelo}
            onChange={(e) => set("modelo", e.target.value)}
          />
          <AppInput
            label="Generación (opcional)"
            placeholder="FK2"
            value={values.generacion}
            onChange={(e) => set("generacion", e.target.value)}
          />
        </FormSection>
      ),
    },

    {
      id: "especificaciones",
      title: "Especificaciones",
      subtitle: "Cuéntanos más sobre tu vehículo",
      validate: (v) => {
        const year = parseWhole(v.ano);
        if (v.ano && (year == null || year < 1900 || year > new Date().getFullYear() + 1)) {
          return { ano: "Año no válido" };
        }
        return {};
      },
      render: ({ values, set, errors }) => (
        <FormSection>
          <AppSelect
            label="Año"
            placeholder="Selecciona el año"
            value={values.ano}
            error={errors.ano}
            onChange={(e) => set("ano", e.target.value)}
            options={vehicleYears().map((y) => ({ value: y, label: y }))}
          />
          <AppInput
            label="Motor"
            placeholder="2.0 i-VTEC"
            value={values.motor}
            onChange={(e) => set("motor", e.target.value)}
          />
          <AppSelect
            label="Combustible"
            value={values.combustible}
            onChange={(e) => set("combustible", e.target.value)}
            options={FUEL_TYPES.map((f) => ({ value: f, label: f }))}
          />
          <AppSelect
            label="Transmisión"
            placeholder="Selecciona la transmisión"
            value={values.transmision}
            onChange={(e) => set("transmision", e.target.value)}
            options={TRANSMISSIONS.map((t) => ({ value: t, label: t }))}
          />
          <AppSelect
            label="Tracción"
            placeholder="Selecciona la tracción"
            value={values.traccion}
            onChange={(e) => set("traccion", e.target.value)}
            options={DRIVETRAINS.map((d) => ({ value: d, label: d }))}
          />
        </FormSection>
      ),
    },

    {
      id: "tecnicos",
      title: "Datos técnicos",
      subtitle: "Todo esto es opcional: sirve para la ficha del vehículo",
      render: ({ values, set }) => (
        <>
          <FormSection columns={2}>
            <AppInput label="Potencia" inputMode="numeric" suffix="CV" placeholder="140"
              value={values.potencia_cv} onChange={(e) => set("potencia_cv", e.target.value)} />
            <AppInput label="Cilindrada" inputMode="numeric" suffix="cc" placeholder="1800"
              value={values.cilindrada_cc} onChange={(e) => set("cilindrada_cc", e.target.value)} />
            <AppInput label="Puertas" inputMode="numeric" placeholder="5"
              value={values.puertas} onChange={(e) => set("puertas", e.target.value)} />
            <AppInput label="Plazas" inputMode="numeric" placeholder="5"
              value={values.plazas} onChange={(e) => set("plazas", e.target.value)} />
            <AppInput label="Peso" inputMode="numeric" suffix="kg" placeholder="1320"
              value={values.peso_kg} onChange={(e) => set("peso_kg", e.target.value)} />
            <AppInput label="Color" placeholder="Negro"
              value={values.color} onChange={(e) => set("color", e.target.value)} />
          </FormSection>
        </>
      ),
    },

    {
      id: "identificacion",
      title: "Identificación",
      subtitle: "Añade los datos de identificación de tu vehículo",
      validate: (v) => {
        const errors: Record<string, string> = {};
        if (v.km && parseWhole(v.km) == null) errors.km = "Kilometraje no válido";
        return errors;
      },
      render: ({ values, set, errors, fieldRef }) => (
        <FormSection
          hint={
            values.km_origen === "matriculacion"
              ? values.fecha_matriculacion
                ? "La media mensual se calcula repartiendo los km totales desde esa fecha."
                : "Rellena la fecha de matriculación o la media de km no se podrá calcular."
              : "La media se cuenta desde tu primer gasto con kilómetros. Útil si no conoces la fecha de matriculación."
          }
        >
          <AppInput
            label="Matrícula"
            placeholder="0000 GMP"
            value={values.matricula}
            onChange={(e) => set("matricula", e.target.value)}
          />
          <AppInput
            label="Número VIN"
            placeholder="WAUZZZ8V5GA123456"
            value={values.bastidor}
            onChange={(e) => set("bastidor", e.target.value)}
          />
          <AppInput
            ref={fieldRef("km")}
            label="Kilometraje actual"
            inputMode="numeric"
            suffix="km"
            placeholder="0"
            value={values.km}
            error={errors.km}
            onChange={(e) => set("km", e.target.value)}
          />
          <AppDatePicker
            label="Fecha de matriculación"
            value={values.fecha_matriculacion}
            onChange={(e) => set("fecha_matriculacion", e.target.value)}
          />
          <AppSelect
            label="Contar la media de km desde"
            value={values.km_origen}
            onChange={(e) => set("km_origen", e.target.value)}
            options={[
              { value: "matriculacion", label: "La fecha de matriculación" },
              { value: "primer_registro", label: "El primer registro con km" },
            ]}
          />
        </FormSection>
      ),
    },

    {
      id: "fechas",
      title: "Fechas legales",
      subtitle: "Se usan para avisarte antes de que caduquen",
      render: ({ values, set }) => (
        <FormSection hint="Los plazos municipales del IVTM varían (lo más común, entre mayo y junio).">
          <AppDatePicker label="Última ITV" value={values.fecha_ultima_itv}
            onChange={(e) => set("fecha_ultima_itv", e.target.value)} />
          <AppDatePicker label="Vencimiento del seguro" value={values.fecha_vencimiento_seguro}
            onChange={(e) => set("fecha_vencimiento_seguro", e.target.value)} />
          <AppDatePicker label="Último pago del IVTM" value={values.fecha_ivtm}
            onChange={(e) => set("fecha_ivtm", e.target.value)} />
        </FormSection>
      ),
    },

    {
      id: "foto",
      title: "Foto del vehículo",
      subtitle: "Añade una foto y revisa el resumen",
      nextLabel: mode === "create" ? "Guardar vehículo" : "Guardar cambios",
      render: ({ values, set, goTo }) => (
        <div className="space-y-6">
          <ImageUploadStep
            title="Subir foto"
            hint="Formatos: JPG, PNG, WEBP"
            aspect="video"
            file={values.foto}
            initialPreviewUrl={initialPhotoId ? `/api/attachments/${initialPhotoId}` : null}
            onSelect={(file) => set("foto", file)}
            onRemove={() => set("foto", null)}
          />

          <SummaryStep
            onEdit={goTo}
            groups={[
              {
                icon: "car",
                title: [values.marca, values.modelo].filter(Boolean).join(" "),
                subtitle: [values.generacion, values.ano].filter(Boolean).join(" · ") || undefined,
                editStepId: "marca-modelo",
                rows: [
                  { label: "Motor", value: values.motor || "—" },
                  { label: "Combustible", value: values.combustible },
                  { label: "Transmisión", value: values.transmision || "—" },
                  { label: "Tracción", value: values.traccion || "—" },
                ],
              },
              {
                title: "Identificación",
                editStepId: "identificacion",
                rows: [
                  { label: "Matrícula", value: values.matricula || "—" },
                  { label: "VIN", value: values.bastidor || "—" },
                  {
                    label: "Kilometraje",
                    value: parseWhole(values.km) != null ? formatKm(parseWhole(values.km)) : "—",
                  },
                  { label: "Matriculación", value: formatDate(values.fecha_matriculacion) || "—" },
                ],
              },
              {
                title: "Fechas legales",
                editStepId: "fechas",
                rows: [
                  { label: "Última ITV", value: formatDate(values.fecha_ultima_itv) || "—" },
                  { label: "Seguro", value: formatDate(values.fecha_vencimiento_seguro) || "—" },
                  { label: "IVTM", value: formatDate(values.fecha_ivtm) || "—" },
                ],
              },
            ]}
          />
        </div>
      ),
    },
  ];

  function payload(values: VehicleValues) {
    return {
      marca: values.marca.trim(),
      modelo: values.modelo.trim(),
      generacion: values.generacion.trim(),
      motor: values.motor.trim(),
      ano: parseWhole(values.ano),
      puertas: parseWhole(values.puertas) ?? 5,
      km: parseWhole(values.km) ?? 0,
      km_actuales: parseWhole(values.km) ?? 0,
      fecha_matriculacion: toNull(values.fecha_matriculacion),
      km_origen: values.km_origen || "matriculacion",
      fecha_ivtm: toNull(values.fecha_ivtm),
      fecha_ultima_itv: toNull(values.fecha_ultima_itv),
      fecha_vencimiento_seguro: toNull(values.fecha_vencimiento_seguro),
      potencia_cv: parseWhole(values.potencia_cv),
      cilindrada_cc: parseWhole(values.cilindrada_cc),
      peso_kg: parseWhole(values.peso_kg),
      plazas: parseWhole(values.plazas),
      color: toNull(values.color),
      matricula: values.matricula.trim(),
      bastidor: values.bastidor.trim(),
      combustible: values.combustible,
      transmision: toNull(values.transmision),
      traccion: toNull(values.traccion),
    };
  }

  async function submit(values: VehicleValues) {
    const name = [values.marca.trim(), values.modelo.trim()].filter(Boolean).join(" ");
    let id = carId;

    if (mode === "create") {
      const res = await fetch("/api/cars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(values)),
      });
      if (!res.ok) throw await errorFrom(res, "No se ha podido crear el vehículo");
      const car = await res.json();
      id = car.id;

      const fotoId = values.foto ? await uploadAttachment(car.id, values.foto, { filename: values.foto.name }) : null;
      if (fotoId != null) {
        await fetch("/api/cars", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: car.id, foto_attachment_id: fotoId }),
        });
      }
    } else {
      const fotoId = values.foto ? await uploadAttachment(carId!, values.foto, { filename: values.foto.name }) : null;
      const res = await fetch("/api/cars", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: carId,
          ...payload(values),
          ...(fotoId != null ? { foto_attachment_id: fotoId } : {}),
        }),
      });
      if (!res.ok) throw await errorFrom(res, "No se han podido guardar los cambios");
    }

    router.refresh();

    return {
      message: mode === "create" ? "Vehículo añadido a tu garaje" : "Cambios guardados correctamente",
      headline: name,
      detail: [values.ano, values.motor, values.combustible].filter(Boolean).join(" · ") || undefined,
      meta: values.matricula || undefined,
      primaryLabel: "Ver vehículo",
      onPrimary: () => router.push(`/coches/${id}`),
    };
  }

  return (
    <Wizard
      mode="page"
      // La edición vive dentro del marco del vehículo, que tiene barra
      // inferior; el alta se abre desde el garaje, donde no la hay.
      hasBottomNav={mode === "edit"}
      title={mode === "create" ? "Añadir vehículo" : "Editar vehículo"}
      steps={steps}
      initialValues={initial}
      submitLabel={mode === "create" ? "Guardar vehículo" : "Guardar cambios"}
      onSubmit={submit}
      onClose={() => router.push(backHref)}
    />
  );
}
