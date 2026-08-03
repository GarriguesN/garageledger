// Validation helpers for API route input.
// All return null on invalid input (never throw).
// Use the null-coalescing pattern in route handlers:
//
//   const carId = parseCarId(body.carId);
//   if (!carId) return NextResponse.json({ error: "carId requerido" }, { status: 400 });
//
// audit:B-6 — Estas funciones existían pero casi ninguna ruta las usaba, y
// además arrastraban el mismo fallo que venían a resolver: `parseInt` y
// `parseFloat` se paran en el primer carácter que no encaja y devuelven lo que
// llevaran leído. `parseInt("12abc")` es 12, `parseFloat("40 litros")` es 40 y
// `parseInt("1.5.2")` es 1. Es decir: una petición contra el coche 12abc se
// ejecutaba contra el coche 12, sin avisar a nadie.
//
// Aquí se valida la FORMA de la cadena antes de convertirla. Una cadena que no
// es un número entero es un error, no un número aproximado.

/** Entero decimal completo, con signo opcional y espacios alrededor. */
const INT_RE = /^\s*[+-]?\d+\s*$/;
/** Decimal completo: 12, 12.5, .5, -0.75. Sin notación científica, que en un
 *  importe o un cuentakilómetros solo puede venir de un error. */
const NUM_RE = /^\s*[+-]?(\d+(\.\d*)?|\.\d+)\s*$/;

/** Convierte a número solo si la cadena ENTERA es un número. */
function strictNumber(v: unknown, re: RegExp): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string" || !re.test(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Parse a car_id / expense_id / task_id — accepts number or numeric string.
 *  Debe ser un entero positivo: los ids de SQLite empiezan en 1. */
export function parseId(v: unknown): number | null {
  const n = strictNumber(v, INT_RE);
  if (n === null || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

/** Alias for clarity at call sites. */
export const parseCarId = parseId;
/** Alias for clarity at call sites. */
export const parseExpenseId = parseId;
/** Alias for clarity at call sites. */
export const parseTaskId = parseId;

/** Parse a monetary amount — accepts number or numeric string, must be >= 0. */
export function parseAmount(v: unknown): number | null {
  const n = strictNumber(v, NUM_RE);
  return n !== null && n >= 0 ? n : null;
}

/** Parse an integer (km, litros, year, etc.) — accepts number or numeric string. */
export function parseIntOrNull(v: unknown): number | null {
  const n = strictNumber(v, INT_RE);
  return n !== null && Number.isInteger(n) ? n : null;
}

/** Parse a float (litros, etc.) — accepts number or numeric string. */
export function parseFloatOrNull(v: unknown): number | null {
  return strictNumber(v, NUM_RE);
}

/** Ensure a value is a non-empty string, or null. */
export function parseString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

/** Ensure a value is a string (possibly empty), or null if not a string. */
export function parseStringOrEmpty(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Parse a date string (YYYY-MM-DD) or null.
 *
 *  Comprueba además que la fecha EXISTA: "2026-02-31" y "2026-13-01" encajan
 *  en el patrón pero no son días del calendario, y guardados en la BD ordenan
 *  como texto igual que cualquier otro, así que no se notan hasta que alguien
 *  mira una gráfica y no le cuadra. */
export function parseDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1) return null;
  // Día 0 del mes siguiente = último día de este mes.
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > lastDay) return null;
  return v;
}
