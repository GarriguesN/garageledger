// Formateo compartido por toda la UI. Un único sitio con las reglas del
// mockup: euros sin decimales salvo cuando el céntimo importa, miles con
// punto, y fechas relativas ("Hoy", "Ayer", "Hace 3 días") en el timeline.
//
// Locale fijo es-ES: la app es de un solo usuario y en español; dejar que
// el locale del navegador decidiera haría que el mismo dato se viera
// distinto en el móvil y en el portátil.

const LOCALE = "es-ES";

/** "182 €". Los importes de lista van sin decimales — el mockup no los
 *  muestra y el céntimo no cambia ninguna decisión a esa escala. */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value).toLocaleString(LOCALE)} €`;
}

/** "0,12 €". Para coste por km y precio por litro, donde el céntimo es el
 *  dato. `decimals` sube a 3 en el precio del combustible (1,325 €/L). */
export function formatCurrencyPrecise(
  value: number | null | undefined,
  decimals = 2,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} €`;
}

/** "132.870 km" */
export function formatKm(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value).toLocaleString(LOCALE)} km`;
}

/** "132.870" — sin unidad, para cuando la etiqueta ya la dice. */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return Math.round(value).toLocaleString(LOCALE);
}

/** "40,00 L" */
export function formatLiters(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} L`;
}

/** "6.3 L/100km" — el consumo se escribe con punto decimal en el mockup. */
export function formatConsumption(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(1);
}

/** Convierte "2026-07-31" en un Date estable. El mediodía evita que el
 *  cambio de huso mueva la fecha un día atrás. */
export function parseDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00`);
}

/** "31/07/2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return parseDate(iso).toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** "12 ene 2027" */
export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  return parseDate(iso).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "Oct 2026" — para plazos lejanos, donde el día no aporta. */
export function formatMonthYear(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseDate(iso);
  const month = d.toLocaleDateString(LOCALE, { month: "short" });
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${d.getFullYear()}`;
}

/** "Feb" — etiqueta del eje X de los gráficos, desde un "2026-02". */
export function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  const d = new Date(year, (month ?? 1) - 1, 1);
  const label = d.toLocaleDateString(LOCALE, { month: "short" });
  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

/** Días completos entre hoy y una fecha. Positivo = futuro. */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = parseDate(iso).getTime();
  if (Number.isNaN(t)) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((t - today.getTime()) / 86_400_000);
}

/** Encabezado de grupo del timeline: "Hoy", "Ayer", "Hace 3 días",
 *  "Hace 2 semanas", y a partir del mes, la fecha real. */
export function relativeDayLabel(iso: string): string {
  const days = daysUntil(iso);
  if (days === null) return iso;

  const past = -days;
  if (past <= 0) return "Hoy";
  if (past === 1) return "Ayer";
  if (past < 7) return `Hace ${past} días`;
  if (past < 14) return "Hace 1 semana";
  if (past < 30) return `Hace ${Math.floor(past / 7)} semanas`;
  if (past < 60) return "Hace 1 mes";
  if (past < 365) return `Hace ${Math.floor(past / 30)} meses`;

  return parseDate(iso).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Plazo restante en lenguaje natural: "en 45 días", "en 2 meses",
 *  "hace 13 días" (vencido). */
export function formatDeadline(iso: string | null | undefined): string | null {
  const days = daysUntil(iso);
  if (days === null) return null;

  if (days < 0) {
    const past = -days;
    if (past === 1) return "hace 1 día";
    if (past < 30) return `hace ${past} días`;
    if (past < 60) return "hace 1 mes";
    return `hace ${Math.floor(past / 30)} meses`;
  }
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  if (days < 45) return `en ${days} días`;
  if (days < 60) return "en 1 mes";
  if (days < 365) return `en ${Math.round(days / 30)} meses`;
  return `en ${Math.round(days / 365)} años`;
}

/** Variación porcentual entre dos periodos. `null` cuando no hay base de
 *  comparación: mostrar "+100%" porque el mes pasado fue cero es ruido. */
export function percentChange(
  current: number,
  previous: number,
): number | null {
  if (!previous || !Number.isFinite(previous) || !Number.isFinite(current)) return null;
  return Math.round(((current - previous) / previous) * 100);
}
