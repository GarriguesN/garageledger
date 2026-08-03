import { NextRequest, NextResponse } from "next/server";
import { getMaintenanceTasks, getMaintenanceTask, getOpenMaintenanceTasksByPreset, getOpenMaintenanceTasksByName, createMaintenanceTask, updateMaintenanceTask, completeMaintenanceTask, deleteMaintenanceTask } from "@/lib/db";
import { parseCarId, parseTaskId } from "@/lib/validate";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const carId = parseCarId(searchParams.get("car_id"));
  if (!carId) return NextResponse.json({ error: "car_id inválido o ausente" }, { status: 400 });

  // Ticket 1.17: endpoint específico para detectar si hay tareas abiertas
  // con un preset_key concreto (usado por el form de gasto).
  const presetKey = searchParams.get("preset_key");
  if (presetKey) {
    return NextResponse.json(getOpenMaintenanceTasksByPreset(carId, presetKey));
  }
  // Fallback: buscar por part_name (para tareas antiguas creadas antes
  // de la migración de preset_key).
  const partName = searchParams.get("part_name");
  if (partName) {
    return NextResponse.json(getOpenMaintenanceTasksByName(carId, partName));
  }
  return NextResponse.json(getMaintenanceTasks(carId));
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  if (body?.action === "complete") {
    // `completeMaintenanceTask` devuelve la tarea SIGUIENTE, que no existe
    // cuando la tarea no es recurrente o cuando se pide no reprogramar. Antes
    // se devolvía 404 en ese caso, así que completar una tarea puntual —algo
    // perfectamente normal— parecía un error. Comprobamos la existencia por
    // separado para no confundir "no hay siguiente" con "no existe".
    const id = parseTaskId(body.id);
    if (!id) return NextResponse.json({ error: "id inválido o ausente" }, { status: 400 });
    const exists = getMaintenanceTask(id);
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const scheduleNext = body.scheduleNext !== false;
    const next = completeMaintenanceTask(id, body.currentKm, body.currentDate, scheduleNext);
    return NextResponse.json({ completed: true, next: next ?? null });
  }
  const carId = parseCarId(body?.carId);
  if (!carId) return NextResponse.json({ error: "carId inválido o ausente" }, { status: 400 });
  if (typeof body.part_name !== "string" || !body.part_name.trim()) {
    return NextResponse.json({ error: "part_name requerido" }, { status: 400 });
  }
  const task = createMaintenanceTask(carId, body.part_name, body);
  return NextResponse.json(task, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const body = await req.json();
  const id = parseTaskId(body?.id ?? searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id inválido o ausente" }, { status: 400 });
  const { id: _, ...fields } = body;
  const updated = updateMaintenanceTask(id, fields);
  return updated ? NextResponse.json(updated) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseTaskId(searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id inválido o ausente" }, { status: 400 });
  deleteMaintenanceTask(id);
  return NextResponse.json({ success: true });
}
