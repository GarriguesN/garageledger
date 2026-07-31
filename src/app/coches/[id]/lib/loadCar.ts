// Carga común a todas las rutas de /coches/[id].
//
// Defensa en profundidad: el middleware ya exige sesión, pero cada pantalla
// vuelve a validarla antes de tocar la base de datos. Si el matcher del
// middleware se quedara corto en el futuro, el redirect de aquí sigue
// impidiendo que se sirva HTML con datos del vehículo.

import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCar, type Car } from "@/lib/db/cars";
import { readSessionFromValue } from "@/lib/auth";

export async function requireCar(params: Promise<{ id: string }>): Promise<Car> {
  const cookieStore = await cookies();
  const session = readSessionFromValue(cookieStore.get("gl_sess")?.value);
  if (!session) redirect("/");

  const { id } = await params;
  const carId = Number.parseInt(id, 10);
  if (!Number.isFinite(carId)) notFound();

  const car = getCar(carId);
  if (!car) notFound();

  return car;
}
