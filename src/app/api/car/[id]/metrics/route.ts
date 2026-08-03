import { NextRequest, NextResponse } from "next/server";
import { getCarMetrics, getCar } from "@/lib/db";
import { parseCarId } from "@/lib/validate";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const carId = parseCarId(id);
  if (!carId) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  if (!getCar(carId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(getCarMetrics(carId));
}
