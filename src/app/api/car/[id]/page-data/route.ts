import { NextRequest, NextResponse } from "next/server";
import { getCar, getCarMetrics, getTimeline } from "@/lib/db";
import { getCarNotes } from "@/lib/db/notes";
import { getCarDocuments } from "@/lib/db/attachments";
import { getMaintenanceTasks } from "@/lib/db/maintenance";
import { getKmStats } from "@/lib/db/cars";
import { parseCarId } from "@/lib/validate";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const carId = parseCarId(id);
  if (!carId) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  const car = getCar(carId);
  if (!car) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Estas seis lecturas son SÍNCRONAS: better-sqlite3 no es asíncrono. Antes
  // iban envueltas en `Promise.resolve` dentro de un `Promise.all`, que no
  // paralelizaba nada —se ejecutan igual, una detrás de otra— pero daba a
  // entender lo contrario a quien leyera el fichero.
  const metrics = getCarMetrics(carId);
  const timeline = getTimeline(carId, 100);
  const notes = getCarNotes(carId);
  const documents = getCarDocuments(carId);
  const maintenanceTasks = getMaintenanceTasks(carId);
  const kmStats = getKmStats(carId);

  return NextResponse.json({ car, metrics, timeline, notes, documents, maintenanceTasks, kmStats });
}
