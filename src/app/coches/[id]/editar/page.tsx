// Edición de un vehículo. Comparte formulario con el alta; la diferencia es
// que los valores iniciales salen del coche y que guarda con PUT.
//
// Los datos se leen en el servidor (requireCar ya valida la sesión), así que
// el formulario recibe los valores ya rellenos en lugar de pedirlos con un
// useEffect y enseñar el formulario vacío mientras llegan.

import { AppHeader } from "@/components/ui";
import { AppScreenMain } from "@/components/ui/AppLayout";
import { requireCar } from "../lib/loadCar";
import CarForm, { type CarFormValues } from "../../components/CarForm";

export const dynamic = "force-dynamic";

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));

export default async function EditCarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const car = await requireCar(params);

  const values: CarFormValues = {
    marca: car.marca,
    modelo: car.modelo,
    generacion: car.generacion,
    motor: car.motor,
    ano: str(car.ano),
    puertas: str(car.puertas),
    km: str(car.km_actuales),
    fecha_matriculacion: str(car.fecha_matriculacion),
    km_origen: car.km_origen,
    matricula: car.matricula,
    bastidor: car.bastidor,
    combustible: car.combustible,
    potencia_cv: str(car.potencia_cv),
    cilindrada_cc: str(car.cilindrada_cc),
    peso_kg: str(car.peso_kg),
    plazas: str(car.plazas),
    color: str(car.color),
    fecha_ivtm: str(car.fecha_ivtm),
    fecha_ultima_itv: str(car.fecha_ultima_itv),
    fecha_vencimiento_seguro: str(car.fecha_vencimiento_seguro),
  };

  return (
    <>
      <AppHeader title="Editar vehículo" align="center" back={`/coches/${car.id}`} />
      <AppScreenMain hasBottomNav className="pt-2">
        <CarForm
          mode="edit"
          carId={car.id}
          initialValues={values}
          initialPhotoId={car.foto_attachment_id}
        />
      </AppScreenMain>
    </>
  );
}
