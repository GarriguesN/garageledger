import { getDb } from "./core";

export interface Attachment { id: number; car_id: number; expense_id: number | null; filename: string; original_name: string; mime_type: string; file_size: number; created_at: string; }

export function getAttachments(carId: number, expenseId?: number): Attachment[] {
  if (expenseId) return getDb().prepare("SELECT * FROM attachments WHERE car_id=? AND expense_id=? ORDER BY created_at DESC").all(carId, expenseId) as Attachment[];
  return getDb().prepare("SELECT * FROM attachments WHERE car_id=? ORDER BY created_at DESC").all(carId) as Attachment[];
}

export function createAttachment(carId: number, filename: string, originalName: string, mimeType: string, fileSize: number, expenseId?: number): Attachment {
  const r = getDb().prepare("INSERT INTO attachments (car_id, expense_id, filename, original_name, mime_type, file_size) VALUES (?,?,?,?,?,?)").run(carId, expenseId || null, filename, originalName, mimeType, fileSize);
  return getDb().prepare("SELECT * FROM attachments WHERE id=?").get(r.lastInsertRowid) as Attachment;
}

export function deleteAttachment(id: number): void {
  getDb().prepare("DELETE FROM attachments WHERE id=?").run(id);
}
