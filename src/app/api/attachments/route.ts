import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getAttachments, createAttachment, deleteAttachment } from "@/lib/db";
import { validateUpload } from "@/lib/attachments";

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
    const carIdRaw = formData.get("car_id") as string | null;
    const expenseIdRaw = formData.get("expense_id") as string | null;
    const file = formData.get("file") as File | null;
    if (!file || !carIdRaw) return NextResponse.json({ error: "Missing file or car_id" }, { status: 400 });
    const carId = parseInt(carIdRaw);
    const expenseId = expenseIdRaw ? parseInt(expenseIdRaw) : undefined;
    if (!Number.isFinite(carId)) return NextResponse.json({ error: "car_id inválido" }, { status: 400 });

    // Validate BEFORE writing to disk (max-input trust: attacker could stream GB).
    const check = validateUpload({
      name: file.name ?? "",
      type: file.type ?? "",
      size: file.size ?? 0,
    });
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    ensureDir(UPLOAD_DIR);

    const ext = path.extname(file.name).toLowerCase();
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
