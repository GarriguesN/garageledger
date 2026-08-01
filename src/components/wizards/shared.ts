// Utilidades que comparten los asistentes.
//
// Los números se escriben con coma decimal en español y con punto en el
// teclado numérico de muchos móviles, así que se aceptan las dos formas en
// vez de castigar al usuario por teclear lo que su teclado le ofrece.

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** "12,50" o "12.50" → 12.5. Devuelve null si no es un número. */
export function parseDecimal(value: string): number | null {
  const n = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Entero o null (campo vacío u opcional sin rellenar). */
export function parseWhole(value: string): number | null {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

/** Suma meses a una fecha ISO manteniendo el formato. */
export function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Sube un archivo ya guardado el gasto/coche al que pertenece. Devuelve el
 *  id del adjunto, o null si la subida falla: perder la foto del ticket no
 *  debe tirar abajo un gasto que ya está guardado. */
export async function uploadAttachment(
  carId: number,
  file: File | Blob,
  opts: { filename?: string; expenseId?: number; documentType?: string | null; validUntil?: string | null; reminderMonths?: number | null } = {},
): Promise<number | null> {
  const fd = new FormData();
  fd.append("car_id", String(carId));
  fd.append("file", file, opts.filename);
  if (opts.expenseId) fd.append("expense_id", String(opts.expenseId));
  if (opts.documentType) fd.append("document_type", opts.documentType);
  if (opts.validUntil) fd.append("valid_until", opts.validUntil);
  if (opts.reminderMonths != null) fd.append("reminder_months", String(opts.reminderMonths));

  const res = await fetch("/api/attachments", { method: "POST", body: fd });
  if (!res.ok) return null;
  const json = await res.json();
  return typeof json?.id === "number" ? json.id : null;
}

/** Lee el mensaje de error que devuelve la API, con un texto de reserva
 *  para cuando la respuesta no trae ninguno. */
export async function errorFrom(res: Response, fallback: string): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  return new Error(body?.error || fallback);
}
