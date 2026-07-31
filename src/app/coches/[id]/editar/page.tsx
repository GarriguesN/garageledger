// Edición de un vehículo. Server Component que carga el coche y lo pasa
// al VehicleWizard en modo "edit" (mockup 1-4 adaptado a edición).

import { getRecentBrands } from "@/lib/db/cars";
import { requireCar } from "../lib/loadCar";
import VehicleWizard, { type VehicleFormValues } from "../../nuevo/VehicleWizard";

export const dynamic = "force-dynamic";

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));

export default async function EditCarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const car = await requireCar(params);
  const recentBrands = getRecentBrands(4);

  const values: VehicleFormValues = {
    marca: car.marca,
    modelo: car.modelo,
    ano: str(car.ano),
    motor: car.motor,
    combustible: car.combustible,
    transmision: "Manual",
    traccion: "Delantera",
    matricula: car.matricula,
    bastidor: car.bastidor,
    km: str(car.km_actuales),
    fecha_matriculacion: str(car.fecha_matriculacion),
    predeterminado: true,
  };

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
