import { getDb } from "./core";
import { DOCUMENT_TYPES, type DocumentTypeId } from "@/lib/documents/catalog";

export interface Attachment {
  id: number;
  car_id: number;
  expense_id: number | null;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  document_type: string | null;
  valid_until: string | null;
  created_at: string;
}

export function getAttachments(carId: number, expenseId?: number): Attachment[] {
  if (expenseId) return getDb().prepare("SELECT * FROM attachments WHERE car_id=? AND expense_id=? ORDER BY created_at DESC").all(carId, expenseId) as Attachment[];
  return getDb().prepare("SELECT * FROM attachments WHERE car_id=? ORDER BY created_at DESC").all(carId) as Attachment[];
}

export function createAttachment(
  carId: number,
  filename: string,
  originalName: string,
  mimeType: string,
  fileSize: number,
  expenseId?: number,
  documentType?: string | null,
  validUntil?: string | null,
): Attachment {
  const r = getDb()
    .prepare("INSERT INTO attachments (car_id, expense_id, filename, original_name, mime_type, file_size, document_type, valid_until) VALUES (?,?,?,?,?,?,?,?)")
    .run(carId, expenseId || null, filename, originalName, mimeType, fileSize, documentType || null, validUntil || null);
  return getDb().prepare("SELECT * FROM attachments WHERE id=?").get(r.lastInsertRowid) as Attachment;
}

export function deleteAttachment(id: number): void {
  getDb().prepare("DELETE FROM attachments WHERE id=?").run(id);
}

/** Corrige categoría y/o fecha de caducidad de un adjunto ya subido, sin
 *  re-subir el archivo (el archivo en sí es inmutable — ver PATCH route). */
export function updateAttachmentMeta(
  id: number,
  fields: { document_type?: string | null; valid_until?: string | null },
): Attachment | null {
  const sets: string[] = [];
  const values: unknown[] = [];
  if ("document_type" in fields) { sets.push("document_type=?"); values.push(fields.document_type ?? null); }
  if ("valid_until" in fields) { sets.push("valid_until=?"); values.push(fields.valid_until ?? null); }
  if (sets.length === 0) return getDb().prepare("SELECT * FROM attachments WHERE id=?").get(id) as Attachment | null;
  values.push(id);
  getDb().prepare(`UPDATE attachments SET ${sets.join(", ")} WHERE id=?`).run(...values);
  return getDb().prepare("SELECT * FROM attachments WHERE id=?").get(id) as Attachment | null;
}

export interface CarDocuments {
  byType: Record<DocumentTypeId, Attachment | null>;
  otros: Attachment[];
}

/** Vista derivada de "documentos del vehículo" para la pestaña Documentos.
 *  Para las 5 categorías de slot único, coge el adjunto más reciente de
 *  ese document_type; subidas anteriores del mismo tipo se quedan en BD
 *  (no se borran) pero no se muestran como "actual" — sin historial en v1.
 *  "otros" (document_type NULL o 'otros') devuelve la lista completa. */
export function getCarDocuments(carId: number): CarDocuments {
  const all = getAttachments(carId);
  const byType = Object.fromEntries(
    DOCUMENT_TYPES.map((d) => [d.id, null]),
  ) as Record<DocumentTypeId, Attachment | null>;

  for (const dt of DOCUMENT_TYPES) {
    const latest = all
      .filter((a) => a.document_type === dt.id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id))[0];
    byType[dt.id] = latest ?? null;
  }

  const otros = all.filter((a) => !a.document_type || a.document_type === "otros");

  return { byType, otros };
}
