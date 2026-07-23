// Server Component para /coches/[id]:
// - Lee sesión server-side (defensa-en-profundidad al middleware: cierra el
//   bucle si por lo que sea el matcher del middleware fallara; también blinda
//   esta página contra cualquier acceso directo que esquivara PinGate cliente).
// - Lee TODO el page-data directamente desde las funciones de src/lib/db/*
//   (NO desde /api/car/[id]/page-data — esa ruta sigue existiendo para los
//   refrescos client-side post-mutación, tal como exige el ticket).
// - Pasa los datos iniciales al componente cliente que mantiene TODA la lógica
//   interactiva (formularios, uploads, refrescos).
//
// Ticket 1.3 — Server Component (sin client hydration para carga inicial),
// sin useEffect para el fetch inicial, sin skeleton cliente.

import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getCar, getCarMetrics, getTimeline } from "@/lib/db";
import { getCarNotes } from "@/lib/db/notes";
import { getAttachments } from "@/lib/db/attachments";
import { getMaintenanceTasks } from "@/lib/db/maintenance";
import { readSessionFromValue } from "@/lib/auth";

import CarDetailClient from "./components/CarDetailClient";

interface PageProps {
  // En Next 16 los params llegan como Promise.
  params: Promise<{ id: string }>;
}

export default async function CarDetailPage({ params }: PageProps) {
  // ── 1) Auth: leer y validar la cookie ANTES de tocar la DB.
  // El middleware ya hace esta verificación (matcher ahora cubre /coches/**),
  // pero replicamos en el Server Component como defensa-en-profundidad: si el
  // matcher se queda corto en el futuro, este redirect sigue blindando el HTML.
  const cookieStore = await cookies();
  const session = readSessionFromValue(cookieStore.get("gl_sess")?.value);
  if (!session) {
    redirect("/");
  }

  // ── 2) Carga inicial en el servidor (mismas queries que /api/.../page-data).
  const { id } = await params;
  const carId = parseInt(id);
  if (!Number.isFinite(carId)) {
    notFound();
  }

  const car = getCar(carId);
  if (!car) {
    notFound();
  }

  // Reutilizamos EXACTAMENTE las mismas funciones que la ruta /api/.../page-data
  // (no duplicamos queries ni lógica de cálculo de métricas).
  const [metrics, timeline, notes, attachments, maintenanceTasks] = await Promise.all([
    Promise.resolve(getCarMetrics(carId)),
    Promise.resolve(getTimeline(carId, 100)),
    Promise.resolve(getCarNotes(carId)),
    Promise.resolve(getAttachments(carId)),
    Promise.resolve(getMaintenanceTasks(carId)),
  ]);


  return (
    <CarDetailClient
      carId={carId}
      initialCar={car}
      initialMetrics={metrics}
      initialTimeline={timeline}
      initialNotes={notes}
      initialAttachments={attachments}
      initialMaintenanceTasks={maintenanceTasks}
    />
  );
}
