import { NextRequest, NextResponse } from "next/server";
import { getCarNotes, createCarNote, deleteCarNote } from "@/lib/db";
import { parseCarId, parseId } from "@/lib/validate";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const carId = parseCarId(searchParams.get("car_id"));
  if (!carId) return NextResponse.json({ error: "car_id inválido o ausente" }, { status: 400 });
  return NextResponse.json(getCarNotes(carId));
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  const carId = parseCarId(body?.carId);
  if (!carId || typeof body?.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "carId y content son requeridos" }, { status: 400 });
  }
  const note = createCarNote(carId, body.content);
  return NextResponse.json(note, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseId(searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id inválido o ausente" }, { status: 400 });
  deleteCarNote(id);
  return NextResponse.json({ success: true });
}
