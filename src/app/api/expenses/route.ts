import { NextRequest, NextResponse } from "next/server";
import { createExpense, updateExpense, deleteExpense, getExpenses } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const carId = searchParams.get("car_id");
  const limit = parseInt(searchParams.get("limit") || "100");
  if (!carId) return NextResponse.json({ error: "car_id required" }, { status: 400 });
  return NextResponse.json(getExpenses(parseInt(carId), limit));
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  if (!body?.carId) return NextResponse.json({ error: "carId requerido" }, { status: 400 });
  const importe = typeof body.importe === "string" ? parseFloat(body.importe) : body.importe;
  if (typeof importe !== "number" || !Number.isFinite(importe) || importe < 0) {
    return NextResponse.json({ error: "importe inválido" }, { status: 400 });
  }
  const exp = createExpense(
    body.carId, body.tipo, body.importe,
    body.date || new Date().toISOString().split("T")[0],
    body.descripcion || "", body.referencia || "",
    body.litros || null, body.km || null, body.costeTaller || null,
    {
      impuestoCirculacion: body.tipo === "Impuestos" && body.impuesto_circulacion === true,
      maintenanceTaskId: body.maintenanceTaskId || undefined,
    }
  );
  return NextResponse.json(exp, { status: 201 });
}

export async function PUT(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const updated = updateExpense(parseInt(id), fields);
  return updated
    ? NextResponse.json(updated)
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  deleteExpense(parseInt(id));
  return NextResponse.json({ success: true });
}
