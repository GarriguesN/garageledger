// Edición de un vehículo. Comparte asistente con el alta; la diferencia es
// que los valores iniciales salen del coche y que guarda con PUT.
//
// Los datos se leen en el servidor (requireCar ya valida la sesión), así que
// el asistente recibe los valores ya rellenos en lugar de pedirlos con un
// useEffect y enseñar los campos vacíos mientras llegan.

import { getCars } from "@/lib/db";
import { requireCar } from "../lib/loadCar";
import VehicleWizard, { type VehicleValues } from "@/components/wizards/VehicleWizard";

export const dynamic = "force-dynamic";

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));

export default async function EditCarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const car = await requireCar(params);

  const values: VehicleValues = {
    marca: car.marca,
    modelo: car.modelo,
    generacion: car.generacion,
    motor: car.motor,
    ano: str(car.ano),
    combustible: car.combustible,
    transmision: str(car.transmision),
    traccion: str(car.traccion),
    potencia_cv: str(car.potencia_cv),
    cilindrada_cc: str(car.cilindrada_cc),
    peso_kg: str(car.peso_kg),
    puertas: str(car.puertas),
    plazas: str(car.plazas),
    color: str(car.color),
    matricula: car.matricula,
    bastidor: car.bastidor,
    km: str(car.km_actuales),
    fecha_matriculacion: str(car.fecha_matriculacion),
    km_origen: car.km_origen,
    fecha_ultima_itv: str(car.fecha_ultima_itv),
    fecha_vencimiento_seguro: str(car.fecha_vencimiento_seguro),
    fecha_ivtm: str(car.fecha_ivtm),
    foto: null,
  };

  const recentBrands = [...new Set(getCars().map((c) => c.marca).filter(Boolean))].slice(0, 4);

  return (
    <VehicleWizard
      mode="edit"
      carId={car.id}
      initialValues={values}
      initialPhotoId={car.foto_attachment_id}
      recentBrands={recentBrands}
    />
  );
}
