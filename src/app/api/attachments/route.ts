import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getAttachments, createAttachment, deleteAttachment } from "@/lib/db";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/opt/garageledger/data/uploads";

function ensureDir(dir: string) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
}

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const carId = searchParams.get("car_id");
  const expenseId = searchParams.get("expense_id");
  if (!carId) return NextResponse.json({ error: "car_id required" }, { status: 400 });
  return NextResponse.json(getAttachments(parseInt(carId), expenseId ? parseInt(expenseId) : undefined));
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const carId = parseInt(formData.get("car_id") as string);
    const expenseId = formData.get("expense_id") ? parseInt(formData.get("expense_id") as string) : undefined;
    const file = formData.get("file") as File;
    if (!file || !carId) return NextResponse.json({ error: "Missing file or car_id" }, { status: 400 });

    ensureDir(UPLOAD_DIR);

    const ext = path.extname(file.name) || "";
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(UPLOAD_DIR, uniqueName), buffer);

    const att = createAttachment(carId, uniqueName, file.name, file.type, buffer.length, expenseId);
    return NextResponse.json(att, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  deleteAttachment(parseInt(id));
  return NextResponse.json({ success: true });
}
