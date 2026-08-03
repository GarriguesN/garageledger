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

  const [metrics, timeline, notes, documents, maintenanceTasks, kmStats] = await Promise.all([
    Promise.resolve(getCarMetrics(carId)),
    Promise.resolve(getTimeline(carId, 100)),
    Promise.resolve(getCarNotes(carId)),
    Promise.resolve(getCarDocuments(carId)),
    Promise.resolve(getMaintenanceTasks(carId)),
    Promise.resolve(getKmStats(carId)),
  ]);

  return NextResponse.json({ car, metrics, timeline, notes, documents, maintenanceTasks, kmStats });
}
