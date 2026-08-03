import { getDb } from "./core";
import { DOCUMENT_TYPES, type DocumentTypeId } from "@/lib/documents/catalog";
import { removeAttachmentFile } from "@/lib/uploads";

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
  /** Cuántos meses antes de `valid_until` hay que avisar. null = sin
   *  recordatorio (el paso 3 del asistente de documentos lo decide). */
  reminder_months: number | null;
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
  reminderMonths?: number | null,
): Attachment {
  const r = getDb()
    .prepare("INSERT INTO attachments (car_id, expense_id, filename, original_name, mime_type, file_size, document_type, valid_until, reminder_months) VALUES (?,?,?,?,?,?,?,?,?)")
    .run(carId, expenseId || null, filename, originalName, mimeType, fileSize, documentType || null, validUntil || null, reminderMonths ?? null);
  return getDb().prepare("SELECT * FROM attachments WHERE id=?").get(r.lastInsertRowid) as Attachment;
}

/** Miniatura de cada gasto que tenga ticket: id del gasto → id del adjunto.
 *
 *  Se resuelve de una sola consulta para toda la lista en vez de una por
 *  fila; el historial de gastos pinta cientos de filas y una consulta por
 *  cada una se nota. Solo cuentan las imágenes: de un PDF no hay miniatura
 *  que enseñar sin renderizarlo. */
export function getExpenseThumbnails(carId: number): Record<number, number> {
  const rows = getDb().prepare(
    "SELECT expense_id, MIN(id) as attachment_id FROM attachments " +
    "WHERE car_id=? AND expense_id IS NOT NULL AND mime_type LIKE 'image/%' " +
    "GROUP BY expense_id",
  ).all(carId) as { expense_id: number; attachment_id: number }[];

  return Object.fromEntries(rows.map((r) => [r.expense_id, r.attachment_id]));
}

/** audit:S-6 — Borra la fila Y el archivo.
 *
 *  Antes solo se borraba la fila, así que cada adjunto eliminado dejaba su
 *  archivo en UPLOAD_DIR para siempre: no solo ocupaba sitio, es que ahí
 *  seguían facturas, permisos de circulación y fotos del DNI que el usuario
 *  creía haber borrado — y que además se copiaban en cada backup.
 *
 *  El orden importa: primero se lee el nombre, luego se borra la fila y solo
 *  entonces el archivo. Si el unlink falla, la fila ya no está y el archivo
 *  queda huérfano —el mismo caso de antes, pero solo cuando falla el disco—;
 *  al revés se podría quedar una fila apuntando a un archivo inexistente. */
export function deleteAttachment(id: number): void {
  const row = getDb()
    .prepare("SELECT filename FROM attachments WHERE id=?")
    .get(id) as { filename: string } | undefined;
  getDb().prepare("DELETE FROM attachments WHERE id=?").run(id);
  if (row?.filename) removeAttachmentFile(row.filename);
}

/** Nombres de archivo de todos los adjuntos de un coche.
 *
 *  Lo necesita `deleteCar`: el `ON DELETE CASCADE` de la FK se lleva las filas
 *  pero SQLite no sabe nada de los archivos, así que hay que apuntarlos antes
 *  de borrar el coche para poder limpiarlos después. */
export function getAttachmentFilenames(carId: number): string[] {
  const rows = getDb()
    .prepare("SELECT filename FROM attachments WHERE car_id=?")
    .all(carId) as { filename: string }[];
  return rows.map((r) => r.filename).filter(Boolean);
}

/** ¿Este adjunto pertenece a este coche? (audit:B-8) */
export function attachmentBelongsToCar(attachmentId: number, carId: number): boolean {
  const row = getDb()
    .prepare("SELECT 1 as ok FROM attachments WHERE id=? AND car_id=?")
    .get(attachmentId, carId) as { ok: number } | undefined;
  return !!row;
}

/** Corrige categoría y/o fecha de caducidad de un adjunto ya subido, sin
 *  re-subir el archivo (el archivo en sí es inmutable — ver PATCH route). */
export function updateAttachmentMeta(
  id: number,
  fields: { document_type?: string | null; valid_until?: string | null; reminder_months?: number | null },
): Attachment | null {
  const sets: string[] = [];
  const values: unknown[] = [];
  if ("document_type" in fields) { sets.push("document_type=?"); values.push(fields.document_type ?? null); }
  if ("valid_until" in fields) { sets.push("valid_until=?"); values.push(fields.valid_until ?? null); }
  if ("reminder_months" in fields) { sets.push("reminder_months=?"); values.push(fields.reminder_months ?? null); }
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
