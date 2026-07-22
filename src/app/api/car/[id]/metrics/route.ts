import { NextRequest, NextResponse } from "next/server";
import { getCarMetrics, getCar } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const metrics = getCarMetrics(parseInt(id));
  return NextResponse.json(metrics);
}
