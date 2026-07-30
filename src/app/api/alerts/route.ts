import { NextResponse } from "next/server";
import { getCars, getCarMetrics } from "@/lib/db";

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

// Agrega las alertas (ITV, seguro, IVTM, mantenimiento) de todos los coches
// no archivados, para el panel de notificaciones del TopBar. Cada alerta
// lleva el coche de origen para poder enlazar a /coches/[id].
export async function GET() {
  const cars = getCars();
  const alerts = cars.flatMap((car) =>
    getCarMetrics(car.id).alerts.map((a) => ({
      ...a,
      carId: car.id,
      carLabel: [car.marca, car.modelo].filter(Boolean).join(" "),
    }))
  );
  alerts.sort((a, b) => SEVERITY_ORDER[a.type] - SEVERITY_ORDER[b.type]);
  return NextResponse.json({ alerts });
}
