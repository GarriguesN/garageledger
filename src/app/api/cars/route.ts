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
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  if (!body?.marca || !body?.modelo) {
    return NextResponse.json({ error: "marca y modelo son requeridos" }, { status: 400 });
  }
  const car = createCar({
    marca: body.marca,
    modelo: body.modelo,
    generacion: body.generacion,
    motor: body.motor,
    ano: body.ano ?? null,
    puertas: body.puertas ?? 5,
    km: body.km ?? 0,
    matricula: body.matricula,
    bastidor: body.bastidor,
    combustible: body.combustible,
    foto_attachment_id: body.foto_attachment_id ?? null,
  });
  return NextResponse.json(car, { status: 201 });
}

export async function PUT(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
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
