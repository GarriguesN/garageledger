import { NextRequest, NextResponse } from "next/server";
import { getTimeline } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit")) || 100;
  const offset = Number(searchParams.get("offset")) || 0;
  return NextResponse.json(getTimeline(parseInt(id), limit, offset));
}
