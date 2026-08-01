// Validation helpers for API route input.
// All return null on invalid input (never throw).
// Use the null-coalescing pattern in route handlers:
//
//   const carId = parseCarId(body.carId);
//   if (!carId) return NextResponse.json({ error: "carId requerido" }, { status: 400 });

/** Parse a car_id / expense_id / task_id — accepts number or numeric string. */
export function parseId(v: unknown): number | null {
  const n = typeof v === "string" ? parseInt(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Alias for clarity at call sites. */
export const parseCarId = parseId;
/** Alias for clarity at call sites. */
export const parseExpenseId = parseId;
/** Alias for clarity at call sites. */
export const parseTaskId = parseId;

/** Parse a monetary amount — accepts number or numeric string, must be >= 0. */
export function parseAmount(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Parse an integer (km, litros, year, etc.) — accepts number or numeric string. */
export function parseIntOrNull(v: unknown): number | null {
  const n = typeof v === "string" ? parseInt(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Parse a float (litros, etc.) — accepts number or numeric string. */
export function parseFloatOrNull(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Ensure a value is a non-empty string, or null. */
export function parseString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

/** Ensure a value is a string (possibly empty), or null if not a string. */
export function parseStringOrEmpty(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Parse a date string (YYYY-MM-DD) or null. */
export function parseDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return null;
}