// audit:B-2 — Las caducidades del coche, calculadas en un solo sitio.
//
// La primera mitad fija la regla (intervalos, ventanas, casos borde). La
// segunda es la que de verdad importa: coge un coche concreto y comprueba que
// el estado de la ficha, la puntuación y la lista de próximos eventos dicen lo
// MISMO. Eso era exactamente lo que fallaba: un coche de menos de diez años
// con la ITV pasada hace trece meses salía "ITV Caducada" en la ficha, con 100
// puntos y con una fecha futura en próximos eventos.

import "./lib/test-db";  // primera línea: fija DB_PATH antes de cargar src/lib/db

import {
  itvIntervalMonths, itvDueDate, insuranceDueDate, taxDueDate,
  carExpiries, daysUntil, parseDay,
  ITV_INTERVAL_MONTHS_BIENNIAL, ITV_INTERVAL_MONTHS_ANNUAL,
} from "../src/lib/domain/expiry";
import { computeCarEstado, getItvDueDate, getCarMetrics } from "../src/lib/db/metrics";
import { computeCarScore } from "../src/lib/db/score";
import { createCar, updateCar } from "../src/lib/db/cars";
import { upcomingEvents } from "../src/lib/ui/events";
import { formatDate } from "../src/lib/format";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean, hint = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label} ${hint}`); }
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
/** Fecha a N meses de hoy, en formato YYYY-MM-DD. */
function monthsFromNow(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return iso(d);
}

const THIS_YEAR = new Date().getFullYear();

console.log("\n=== Reglas de caducidad ===");

// ── 1) Intervalo de ITV según la edad.
{
  expect("un coche de este año va cada 2 años",
    itvIntervalMonths({ ano: THIS_YEAR }) === ITV_INTERVAL_MONTHS_BIENNIAL);
  expect("con exactamente 10 años sigue siendo bienal",
    itvIntervalMonths({ ano: THIS_YEAR - 10 }) === ITV_INTERVAL_MONTHS_BIENNIAL);
  expect("con 11 años pasa a anual",
    itvIntervalMonths({ ano: THIS_YEAR - 11 }) === ITV_INTERVAL_MONTHS_ANNUAL);
  expect("sin año conocido se asume lo estricto (anual)",
    itvIntervalMonths({ ano: null }) === ITV_INTERVAL_MONTHS_ANNUAL);
}

// ── 2) La fecha se calcula con meses de calendario, no con bloques de 30 días.
{
  const due = itvDueDate({ ano: THIS_YEAR - 2, fecha_ultima_itv: "2024-01-31" });
  // 31 de enero + 24 meses. `setMonth` desborda al mes siguiente cuando el día
  // no existe, que es lo que cualquiera espera al mirar una fecha de ITV.
  expect("enero + 24 meses cae en 2026", due?.getFullYear() === 2026, `(${due && iso(due)})`);
  expect("y no se desvía diez días como con 30·meses",
    due !== null && Math.abs(due.getTime() - new Date("2026-01-31T12:00:00").getTime()) < 3 * 86_400_000,
    `(${due && iso(due)})`);
}

// ── 3) Fechas ausentes o corruptas no envenenan el cálculo.
{
  expect("sin última ITV no hay fecha", itvDueDate({ ano: 2020, fecha_ultima_itv: null }) === null);
  expect("una fecha basura devuelve null", parseDay("no-es-fecha") === null);
  expect("daysUntil(null) es null", daysUntil(null) === null);
  expect("sin seguro no hay fecha", insuranceDueDate({ fecha_vencimiento_seguro: null }) === null);
  expect("sin pagos no hay impuesto",
    taxDueDate({ fecha_ivtm: null, fecha_impuesto_circulacion: null }) === null);
}

// ── 4) El impuesto se cuenta desde el pago MÁS RECIENTE de los dos apuntes.
{
  const due = taxDueDate({ fecha_ivtm: "2026-05-01", fecha_impuesto_circulacion: "2024-06-01" });
  expect("manda el pago más reciente", due !== null && due.getFullYear() === 2027, `(${due && iso(due)})`);
}

// ── 5) Estados: caducado / próximo / al día.
{
  const car = {
    ano: THIS_YEAR - 2,
    fecha_ultima_itv: monthsFromNow(-25),      // bienal → venció hace un mes
    fecha_vencimiento_seguro: monthsFromNow(1), // dentro de un mes → aviso
    fecha_ivtm: monthsFromNow(-2),              // pagado hace 2 meses → al día
    fecha_impuesto_circulacion: null,
  };
  const e = carExpiries(car);
  expect("ITV pasada de plazo → expired", e.itv.state === "expired", `(${e.itv.state})`);
  expect("seguro a un mes → soon", e.insurance.state === "soon", `(${e.insurance.state})`);
  expect("impuesto reciente → ok", e.tax.state === "ok", `(${e.tax.state})`);
}

console.log("\n=== Las tres pantallas dicen lo mismo ===");

// ── 6) EL CASO DEL INFORME: coche de menos de 10 años, ITV hace 13 meses.
//    Le toca cada dos años, así que está EN PLAZO.
{
  const car = createCar({ marca: "Honda", modelo: "Civic", ano: THIS_YEAR - 8 });
  updateCar(car.id, {
    fecha_ultima_itv: monthsFromNow(-13),
    fecha_vencimiento_seguro: monthsFromNow(6),
  });

  const estado = computeCarEstado({ ...car, fecha_ultima_itv: monthsFromNow(-13) }, []);
  const score = computeCarScore(car.id);
  const due = getItvDueDate({ ano: THIS_YEAR - 8, fecha_ultima_itv: monthsFromNow(-13) })!;

  expect("la ficha NO dice 'ITV Caducada'", estado !== "ITV Caducada", `(${estado})`);
  expect("la puntuación no penaliza la ITV",
    !score.factors.some((f) => f.label.includes("ITV caducada")),
    `(${score.factors.map((f) => f.label).join(", ") || "sin factores"})`);
  expect("la fecha de próxima ITV está en el futuro", due.getTime() > Date.now(), `(${iso(due)})`);
  expect("no hay alerta de ITV caducada",
    !getCarMetrics(car.id).alerts.some((a) => a.topic === "itv" && a.type === "critical"));
}

// ── 7) Y cuando SÍ está caducada, las tres lo dicen a la vez.
{
  const car = createCar({ marca: "Toyota", modelo: "Corolla", ano: THIS_YEAR - 8 });
  const itvVieja = monthsFromNow(-30);  // bienal → venció hace 6 meses
  updateCar(car.id, { fecha_ultima_itv: itvVieja, fecha_vencimiento_seguro: monthsFromNow(6) });

  const estado = computeCarEstado({ ...car, fecha_ultima_itv: itvVieja }, []);
  const score = computeCarScore(car.id);
  const alerts = getCarMetrics(car.id).alerts;

  expect("la ficha dice 'ITV Caducada'", estado === "ITV Caducada", `(${estado})`);
  expect("la puntuación penaliza la ITV",
    score.factors.some((f) => f.label === "ITV caducada"));
  expect("hay alerta crítica de ITV",
    alerts.some((a) => a.topic === "itv" && a.type === "critical"));
  expect("y la nota baja de verdad", score.score < 70, `(${score.score})`);
}

// ── 8) Un coche viejo (ITV anual) con la misma fecha SÍ está caducado.
//    Mismo dato, respuesta distinta: la diferencia es la edad, y las tres
//    pantallas la tienen ahora en cuenta igual.
{
  const itvHace13Meses = monthsFromNow(-13);
  const nuevo = computeCarEstado(
    { id: 0, ano: THIS_YEAR - 8, fecha_ultima_itv: itvHace13Meses, fecha_vencimiento_seguro: null, km_actuales: 0 },
    [],
  );
  const viejo = computeCarEstado(
    { id: 0, ano: THIS_YEAR - 15, fecha_ultima_itv: itvHace13Meses, fecha_vencimiento_seguro: null, km_actuales: 0 },
    [],
  );
  expect("coche de 8 años con ITV de hace 13 meses: en plazo", nuevo !== "ITV Caducada", `(${nuevo})`);
  expect("coche de 15 años con la misma fecha: caducada", viejo === "ITV Caducada", `(${viejo})`);
}

// ── 9) El impuesto ya no se avisa dos veces.
//    Antes, `fecha_impuesto_circulacion` y `fecha_ivtm` generaban cada una su
//    alerta: el mismo trámite aparecía duplicado, y con fechas distintas si los
//    dos apuntes no coincidían.
{
  const car = createCar({ marca: "Seat", modelo: "Ibiza", ano: THIS_YEAR - 3 });
  updateCar(car.id, {
    fecha_ivtm: monthsFromNow(-14),
    fecha_impuesto_circulacion: monthsFromNow(-18),
  });
  const taxAlerts = getCarMetrics(car.id).alerts.filter((a) => a.topic === "tax");
  expect("un solo aviso de impuesto, no dos", taxAlerts.length === 1,
    `(${taxAlerts.length}: ${taxAlerts.map((a) => a.title).join(" / ")})`);
}

// ── 10) La lista de próximos eventos usa la misma fecha que la alerta.
{
  const car = createCar({ marca: "Ford", modelo: "Focus", ano: THIS_YEAR - 4 });
  const itvFecha = monthsFromNow(-23);  // bienal → vence dentro de un mes
  updateCar(car.id, { fecha_ultima_itv: itvFecha });

  const events = upcomingEvents(createCarView(car.id, itvFecha), []);
  const itvEvent = events.find((e) => e.id === "itv");
  const due = itvDueDate({ ano: THIS_YEAR - 4, fecha_ultima_itv: itvFecha })!;

  // El evento no expone la fecha ISO, sino la ya formateada y los días que
  // faltan; con eso basta para comprobar que sale del mismo cálculo.
  const diasDominio = daysUntil(due)!;
  expect("próximos eventos incluye la ITV", !!itvEvent);
  expect("con la misma fecha que el dominio",
    itvEvent?.value === formatDate(iso(due)),
    `(evento ${itvEvent?.value} vs dominio ${iso(due)})`);
  expect("y con los mismos días restantes",
    itvEvent?.daysLeft === diasDominio,
    `(evento ${itvEvent?.daysLeft} vs dominio ${diasDominio})`);
}

/** El coche tal y como lo recibe la capa de UI. */
function createCarView(id: number, fechaItv: string) {
  return {
    id,
    ano: THIS_YEAR - 4,
    fecha_ultima_itv: fechaItv,
    fecha_vencimiento_seguro: null,
    fecha_ivtm: null,
    fecha_impuesto_circulacion: null,
  } as never;
}

console.log(`\nCaducidades: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
