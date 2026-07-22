import { getDb } from "./core";

export interface CarNote { id: number; car_id: number; content: string; created_at: string; }

export function getCarNotes(carId: number): CarNote[] {
  return getDb().prepare("SELECT * FROM car_notes WHERE car_id=? ORDER BY created_at DESC").all(carId) as CarNote[];
}

export function createCarNote(carId: number, content: string): CarNote {
  const r = getDb().prepare("INSERT INTO car_notes (car_id, content) VALUES (?,?)").run(carId, content);
  return getDb().prepare("SELECT * FROM car_notes WHERE id=?").get(r.lastInsertRowid) as CarNote;
}

export function deleteCarNote(id: number): void {
  getDb().prepare("DELETE FROM car_notes WHERE id=?").run(id);
}
