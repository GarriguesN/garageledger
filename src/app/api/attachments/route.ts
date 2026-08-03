import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { randomUUID } from "node:crypto";
import { getAttachments, createAttachment, deleteAttachment, getCar, getExpense } from "@/lib/db";
import { validateUpload, validateUploadContent } from "@/lib/attachments";
import { ensureUploadDir, uploadDir } from "@/lib/uploads";
import { isValidDocumentType } from "@/lib/documents/catalog";
import { parseDate } from "@/lib/validate";

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
    const documentTypeRaw = formData.get("document_type") as string | null;
    const validUntilRaw = formData.get("valid_until") as string | null;
    const reminderMonthsRaw = formData.get("reminder_months") as string | null;
    if (!file || !carIdRaw) return NextResponse.json({ error: "Missing file or car_id" }, { status: 400 });
    const carId = parseInt(carIdRaw);
    const expenseId = expenseIdRaw ? parseInt(expenseIdRaw) : undefined;
    if (!Number.isFinite(carId)) return NextResponse.json({ error: "car_id inválido" }, { status: 400 });

    // audit:B-8 — Integridad referencial antes de escribir nada.
    //
    // El coche tiene que existir: si no, se guardaba una fila apuntando a un
    // id inexistente (la FK la habría rechazado, pero el archivo ya estaría
    // escrito en disco) o, peor, se colgaba de un id que se reutilizara luego.
    if (!getCar(carId)) {
      return NextResponse.json({ error: "El vehículo no existe" }, { status: 404 });
    }
    // Y el gasto, si se indica, tiene que ser DE ESE COCHE. No se comprobaba,
    // así que se podía colgar el ticket de un coche en el gasto de otro y la
    // miniatura aparecía en un historial ajeno.
    if (expenseId !== undefined) {
      if (!Number.isFinite(expenseId)) {
        return NextResponse.json({ error: "expense_id inválido" }, { status: 400 });
      }
      const expense = getExpense(expenseId);
      if (!expense || expense.car_id !== carId) {
        return NextResponse.json(
          { error: "El gasto no existe o no pertenece a este vehículo" },
          { status: 400 },
        );
      }
    }

    let documentType: string | null = null;
    if (documentTypeRaw) {
      if (documentTypeRaw !== "otros" && !isValidDocumentType(documentTypeRaw)) {
        return NextResponse.json({ error: "document_type inválido" }, { status: 400 });
      }
      documentType = documentTypeRaw;
    }
    let validUntil: string | null = null;
    if (validUntilRaw) {
      validUntil = parseDate(validUntilRaw);
      if (!validUntil) return NextResponse.json({ error: "valid_until inválido" }, { status: 400 });
    }
    // Aviso previo a la caducidad, en meses. Sin fecha de caducidad no
    // significa nada, así que se descarta en ese caso en vez de guardarlo
    // huérfano.
    let reminderMonths: number | null = null;
    if (reminderMonthsRaw && validUntil) {
      const parsed = Number.parseInt(reminderMonthsRaw, 10);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 12) {
        return NextResponse.json({ error: "reminder_months inválido" }, { status: 400 });
      }
      reminderMonths = parsed;
    }

    // Validate BEFORE writing to disk (max-input trust: attacker could stream GB).
    const check = validateUpload({
      name: file.name ?? "",
      type: file.type ?? "",
      size: file.size ?? 0,
    });
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    // El contenido se comprueba con el archivo ya en memoria pero ANTES de
    // escribirlo (audit:S-7): hasta ahora todo lo que se validaba —el MIME y
    // la extensión— lo declaraba el cliente, y un HTML renombrado a .png y
    // enviado como image/png pasaba las dos comprobaciones.
    const buffer = Buffer.from(await file.arrayBuffer());
    const content = validateUploadContent(buffer, file.type);
    if (!content.ok) {
      return NextResponse.json({ error: content.error }, { status: content.status });
    }

    ensureUploadDir();

    const ext = path.extname(file.name).toLowerCase();
    // audit:S-8 — randomUUID en vez de Math.random: no es que una colisión
    // fuera probable, es que aquí una colisión sobrescribe el archivo de otro
    // y no cuesta nada quitarse la duda.
    const uniqueName = `${Date.now()}-${randomUUID()}${ext}`;
    fs.writeFileSync(path.join(uploadDir(), uniqueName), buffer);

    const att = createAttachment(carId, uniqueName, file.name, file.type, buffer.length, expenseId, documentType, validUntil, reminderMonths);
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
