// Layout compartido de las pantallas del vehículo. Monta el marco, la barra
// inferior contextual y el asistente de gasto una sola vez, de modo que
// navegar entre Resumen, Actividad, Mantenimiento y Documentos no los
// desmonte (la barra parpadearía en cada cambio).
//
// La cabecera NO va aquí: cada pantalla tiene la suya (título centrado con
// ← en el resumen, título a la izquierda con filtro en gastos…), y ponerla
// dentro del main la dejaría dentro del padding lateral.

import { requireCar } from "./lib/loadCar";
import { getRecentStations } from "@/lib/db/expenses";
import CarShell from "./components/CarShell";

export default async function CarLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const car = await requireCar(params);

  return (
    <CarShell
      carId={car.id}
      currentKm={car.km_actuales}
      stations={getRecentStations(car.id)}
    >
      {children}
    </CarShell>
  );
}
