import { NextRequest, NextResponse } from "next/server";
import { getCar, getCars, createCar, updateCar, deleteCar } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    const car = getCar(parseInt(id));
    return car ? NextResponse.json(car) : NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(getCars());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const car = createCar(body.marca, body.modelo, body.generacion || "", body.motor || "", body.ano || null, body.puertas || 5, body.km || 0);
  return NextResponse.json(car, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const updated = updateCar(parseInt(id), fields);
  return updated
    ? NextResponse.json(updated)
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  deleteCar(parseInt(id));
  return NextResponse.json({ success: true });
}
