import { NextRequest, NextResponse } from "next/server";
import { getTimeline } from "@/lib/db";
import { parseCarId } from "@/lib/validate";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const carId = parseCarId(id);
  if (!carId) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit")) || 100;
  const offset = Number(searchParams.get("offset")) || 0;
  return NextResponse.json(getTimeline(carId, limit, offset));
}
