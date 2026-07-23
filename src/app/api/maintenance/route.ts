import { NextRequest, NextResponse } from "next/server";
import { getMaintenanceTasks, createMaintenanceTask, updateMaintenanceTask, completeMaintenanceTask, deleteMaintenanceTask } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const carId = searchParams.get("car_id");
  if (!carId) return NextResponse.json({ error: "car_id required" }, { status: 400 });
  return NextResponse.json(getMaintenanceTasks(parseInt(carId)));
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  if (body.action === "complete") {
    const updated = completeMaintenanceTask(body.id, body.currentKm, body.currentDate);
    return updated ? NextResponse.json(updated) : NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const task = createMaintenanceTask(body.carId, body.part_name, body);
  return NextResponse.json(task, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const updated = updateMaintenanceTask(id, fields);
  return updated ? NextResponse.json(updated) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  deleteMaintenanceTask(parseInt(id));
  return NextResponse.json({ success: true });
}
