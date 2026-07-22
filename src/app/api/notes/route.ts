import { NextRequest, NextResponse } from "next/server";
import { getCarNotes, createCarNote, deleteCarNote } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const carId = searchParams.get("car_id");
  if (!carId) return NextResponse.json({ error: "car_id required" }, { status: 400 });
  return NextResponse.json(getCarNotes(parseInt(carId)));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const note = createCarNote(body.carId, body.content);
  return NextResponse.json(note, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  deleteCarNote(parseInt(id));
  return NextResponse.json({ success: true });
}
