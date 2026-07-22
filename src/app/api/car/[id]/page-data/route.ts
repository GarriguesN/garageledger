import { NextRequest, NextResponse } from "next/server";
import { getCar, getCarMetrics, getTimeline } from "@/lib/db";
import { getCarNotes } from "@/lib/db/notes";
import { getAttachments } from "@/lib/db/attachments";
import { getMaintenanceTasks } from "@/lib/db/maintenance";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const carId = parseInt(id);

  const car = getCar(carId);
  if (!car) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [metrics, timeline, notes, attachments, maintenanceTasks] = await Promise.all([
    Promise.resolve(getCarMetrics(carId)),
    Promise.resolve(getTimeline(carId, 100)),
    Promise.resolve(getCarNotes(carId)),
    Promise.resolve(getAttachments(carId)),
    Promise.resolve(getMaintenanceTasks(carId)),
  ]);

  return NextResponse.json({ car, metrics, timeline, notes, attachments, maintenanceTasks });
}
