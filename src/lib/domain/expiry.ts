// Cuándo caduca cada trámite del coche: ITV, seguro e impuesto de circulación.
//
// audit:B-2 — Esto estaba escrito tres veces, y las tres decían cosas
// distintas del mismo coche:
//
//   · `getItvDueDate` (metrics.ts) sumaba `intervalo × 30 días` y consideraba
//     "nuevo" al coche con `ano > añoActual - 10`.
//   · `computeCarScore` (score.ts) sumaba meses de calendario y consideraba
//     "nuevo" al de `edad <= 10`. Un año de diferencia con el anterior, y unos
//     diez días de diferencia en la fecha resultante.
//   · `computeCarEstado` (metrics.ts) directamente ignoraba el intervalo:
//     declaraba "ITV Caducada" a los 30 días de la última inspección. Un coche
//     de 2018 con la ITV pasada hace trece meses —en plazo, porque le toca
//     cada dos años— aparecía como caducado en la ficha mientras la
//     puntuación y la lista de próximos eventos decían que estaba bien.
//
// Que tres sitios calculen lo mismo de tres maneras no es un detalle de
// estilo: es la razón de que la app se contradiga a sí misma. A partir de
// aquí, la regla se escribe una vez.

/** Lo que hace falta saber de un coche para calcular sus vencimientos. Se
 *  define en estructural y no como `Car` para que el módulo no dependa de la
 *  capa de datos y se pueda probar con objetos sueltos. */
export interface ExpiryCar {
  ano: number | null;
  fecha_ultima_itv: string | null;
  fecha_vencimiento_seguro: string | null;
  fecha_ivtm: string | null;
  fecha_impuesto_circulacion: string | null;
}

/** Hasta esta edad la ITV es bienal; a partir de ahí, anual.
 *
 *  Es la normativa española simplificada. La de verdad tiene un tramo más
 *  —los turismos de menos de 4 años están exentos— que la app no modela: el
 *  efecto sería no pintar ningún aviso durante los primeros años, y el
 *  usuario que estrena coche prefiere ver la fecha aunque no le toque todavía.
 *  Si algún día se modela, este es el sitio. */
export const ITV_BIENNIAL_MAX_AGE_YEARS = 10;
export const ITV_INTERVAL_MONTHS_BIENNIAL = 24;
export const ITV_INTERVAL_MONTHS_ANNUAL = 12;

/** El impuesto de circulación y el seguro son anuales. */
export const TAX_INTERVAL_MONTHS = 12;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Convierte "YYYY-MM-DD" a Date al mediodía.
 *
 *  El mediodía no es capricho: a medianoche, el cambio de horario de verano
 *  mueve la fecha un día en media Europa, y estas cuentas se hacen sobre
 *  fechas civiles, no sobre instantes. Devuelve null si la cadena no es una
 *  fecha utilizable, en vez de un Invalid Date que envenena todo lo que toca. */
export function parseDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value + "T12:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Días que faltan (negativo si ya pasó). null si no hay fecha. */
export function daysUntil(value: string | Date | null | undefined, now = Date.now()): number | null {
  const d = typeof value === "string" || value == null ? parseDay(value as string | null) : value;
  if (!d) return null;
  return Math.ceil((d.getTime() - now) / MS_PER_DAY);
}

/** Suma meses de calendario. `setMonth` ya ajusta el desbordamiento (el 31 de
 *  enero + 1 mes cae en marzo), que es lo que espera cualquiera que mire una
 *  fecha de ITV. Sumar `meses × 30 días` desviaba ~10 días en un plazo de dos
 *  años, suficiente para que dos pantallas dieran fechas distintas. */
function addMonths(date: Date, months: number): Date {
  const out = new Date(date);
  out.setMonth(out.getMonth() + months);
  return out;
}

/** Cada cuántos meses le toca la ITV a este coche. */
export function itvIntervalMonths(car: Pick<ExpiryCar, "ano">, now = Date.now()): number {
  if (!car.ano) return ITV_INTERVAL_MONTHS_ANNUAL;
  const age = new Date(now).getFullYear() - car.ano;
  return age <= ITV_BIENNIAL_MAX_AGE_YEARS
    ? ITV_INTERVAL_MONTHS_BIENNIAL
    : ITV_INTERVAL_MONTHS_ANNUAL;
}

/** Cuándo toca la próxima ITV. null si no hay una última inspección apuntada. */
export function itvDueDate(
  car: Pick<ExpiryCar, "ano" | "fecha_ultima_itv">,
  now = Date.now(),
): Date | null {
  const last = parseDay(car.fecha_ultima_itv);
  if (!last) return null;
  return addMonths(last, itvIntervalMonths(car, now));
}

/** Cuándo vence el seguro. Aquí la fecha ya ES la de vencimiento (la guarda
 *  así el auto-update de gastos, sumando un año al pagarlo), así que no hay
 *  intervalo que aplicar. Existe como función para que las tres caducidades se
 *  pidan igual desde fuera. */
export function insuranceDueDate(
  car: Pick<ExpiryCar, "fecha_vencimiento_seguro">,
): Date | null {
  return parseDay(car.fecha_vencimiento_seguro);
}

/** Cuándo vuelve a tocar el impuesto de circulación: un año después del último
 *  pago. `fecha_ivtm` la rellena el usuario y `fecha_impuesto_circulacion` la
 *  deduce el auto-update de gastos; manda la más reciente de las dos. */
export function taxDueDate(
  car: Pick<ExpiryCar, "fecha_ivtm" | "fecha_impuesto_circulacion">,
): Date | null {
  const paid = [car.fecha_ivtm, car.fecha_impuesto_circulacion]
    .filter((d): d is string => !!d)
    .sort()
    .pop();
  const last = parseDay(paid);
  return last ? addMonths(last, TAX_INTERVAL_MONTHS) : null;
}

export type ExpiryState = "unknown" | "expired" | "soon" | "ok";

export interface ExpiryStatus {
  state: ExpiryState;
  /** Fecha de vencimiento, si se conoce. */
  due: Date | null;
  /** Días que faltan (negativo si ya venció). null si no se conoce. */
  daysLeft: number | null;
}

/** Estado de un vencimiento respecto a hoy.
 *
 *  `warnDays` es la ventana de aviso, y varía a propósito según el trámite:
 *  el seguro se avisa con dos meses porque renovarlo lleva comparar ofertas,
 *  la ITV con uno porque es pedir cita. */
export function expiryStatus(due: Date | null, warnDays: number, now = Date.now()): ExpiryStatus {
  if (!due) return { state: "unknown", due: null, daysLeft: null };
  const daysLeft = daysUntil(due, now)!;
  if (daysLeft < 0) return { state: "expired", due, daysLeft };
  if (daysLeft <= warnDays) return { state: "soon", due, daysLeft };
  return { state: "ok", due, daysLeft };
}

/** Ventanas de aviso, en un solo sitio para que la alerta, la puntuación y el
 *  estado del coche no discrepen sobre qué es "próximo". */
export const WARN_DAYS = {
  itv: 30,
  insurance: 60,
  tax: 30,
} as const;

/** Los tres vencimientos de un coche, resueltos de una vez. */
export function carExpiries(car: ExpiryCar, now = Date.now()) {
  return {
    itv: expiryStatus(itvDueDate(car, now), WARN_DAYS.itv, now),
    insurance: expiryStatus(insuranceDueDate(car), WARN_DAYS.insurance, now),
    tax: expiryStatus(taxDueDate(car), WARN_DAYS.tax, now),
  };
}
