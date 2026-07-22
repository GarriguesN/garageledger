import { NextRequest, NextResponse } from "next/server";
import { getTimeline } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json(getTimeline(parseInt(id), 100));
}
