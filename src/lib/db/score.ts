// Puntuación de salud del vehículo (0–100).
//
// El mockup enseña un "94/100 — Excelente estado" en el resumen y su
// evolución en Insights. La app solo tenía `estado`, una cadena
// ("Al dia", "Taller necesario"), así que aquí se deriva un número.
//
// Modelo: se parte de 100 y se resta por cada problema abierto. Los pesos
// están calibrados para que un coche con una tarea vencida no baje de
// "Bueno" (la mayoría de conductores llevan algo pendiente), pero la ITV o
// el seguro caducados —que son ilegales, no solo inconvenientes— sí hundan
// la nota.
//
// Deliberadamente NO se penaliza por falta de datos: un coche recién dado de
// alta, sin ITV registrada ni tareas, sale con 100. Castigar el "aún no lo he
// rellenado" haría que la app se sintiera acusadora desde el primer minuto.

import { getDb } from "./core";
import { getCar } from "./cars";
import { carExpiries, daysUntil } from "@/lib/domain/expiry";

/** Cuánto resta cada problema. */
const PENALTY = {
  /** Tarea de mantenimiento pasada de km o de fecha. */
  taskOverdue: 12,
  /** Tarea dentro de su ventana de aviso (último 15% del intervalo). */
  taskDue: 4,
  /** ITV caducada: el coche no puede circular legalmente. */
  itvExpired: 35,
  /** ITV en los próximos 30 días. */
  itvSoon: 8,
  /** Seguro caducado: idem. */
  insuranceExpired: 35,
  /** Seguro en los próximos 30 días. */
  insuranceSoon: 8,
  /** Impuesto de circulación con más de un año. */
  taxOverdue: 10,
} as const;

/** Tope de penalización acumulada por tareas de mantenimiento: cinco tareas
 *  vencidas ya describen el estado del coche; la sexta no aporta información
 *  y solo serviría para llevar la nota a cero. */
const MAX_TASK_PENALTY = 40;

export type CarCondition = "excelente" | "bueno" | "regular" | "malo";

export interface CarScore {
  /** 0–100, entero. */
  score: number;
  condition: CarCondition;
  /** Etiqueta en español para la UI: "Excelente", "Bueno"… */
  label: string;
  /** Frase corta bajo la puntuación en el resumen. */
  summary: string;
  /** Qué ha restado puntos, ordenado de mayor a menor impacto. Alimenta el
   *  detalle de Insights y evita que la nota parezca sacada de la manga. */
  factors: { label: string; penalty: number }[];
}

const CONDITION_LABEL: Record<CarCondition, string> = {
  excelente: "Excelente",
  bueno: "Bueno",
  regular: "Regular",
  malo: "Requiere atención",
};

const CONDITION_SUMMARY: Record<CarCondition, string> = {
  excelente: "¡Todo en orden!",
  bueno: "Casi todo al día",
  regular: "Hay cosas pendientes",
  malo: "Necesita una revisión",
};

function conditionFor(score: number): CarCondition {
  if (score >= 85) return "excelente";
  if (score >= 70) return "bueno";
  if (score >= 50) return "regular";
  return "malo";
}

export function computeCarScore(carId: number): CarScore {
  const car = getCar(carId);
  if (!car) {
    return {
      score: 0,
      condition: "malo",
      label: CONDITION_LABEL.malo,
      summary: CONDITION_SUMMARY.malo,
      factors: [],
    };
  }

  const factors: { label: string; penalty: number }[] = [];

  // ── Mantenimientos abiertos ─────────────────────────────────────
  const tasks = getDb()
    .prepare("SELECT * FROM maintenance_tasks WHERE car_id=? AND completed=0")
    .all(carId) as any[];

  let taskPenalty = 0;
  let overdue = 0;
  let due = 0;

  for (const t of tasks) {
    const kmOverdue = t.next_km != null && t.next_km <= car.km_actuales;
    const dateOverdue = t.next_date != null && (daysUntil(t.next_date) ?? 1) < 0;

    if (kmOverdue || dateOverdue) {
      taskPenalty += PENALTY.taskOverdue;
      overdue++;
      continue;
    }

    const window = (t.interval_km || 15000) * 0.15;
    const kmSoon = t.next_km != null && t.next_km - car.km_actuales < window;
    const dateSoon = t.next_date != null && (daysUntil(t.next_date) ?? 999) < 30;
    if (kmSoon || dateSoon) {
      taskPenalty += PENALTY.taskDue;
      due++;
    }
  }

  taskPenalty = Math.min(taskPenalty, MAX_TASK_PENALTY);
  if (overdue > 0) {
    factors.push({
      label: overdue === 1 ? "1 mantenimiento vencido" : `${overdue} mantenimientos vencidos`,
      penalty: taskPenalty,
    });
  } else if (due > 0) {
    factors.push({
      label: due === 1 ? "1 mantenimiento próximo" : `${due} mantenimientos próximos`,
      penalty: taskPenalty,
    });
  }

  // ── ITV, seguro e impuesto ──────────────────────────────────────
  //
  // audit:B-2 — Los vencimientos salen del mismo módulo que usan las alertas y
  // el estado del coche. Aquí había una tercera copia del cálculo de la ITV
  // que discrepaba de la de metrics.ts en un año de antigüedad y en unos diez
  // días de fecha, así que la nota y el aviso podían no coincidir.
  //
  // La ventana de aviso de la nota es intencionadamente más corta que la de
  // las alertas: un seguro que vence dentro de dos meses merece un recordatorio
  // pero no bajarle la puntuación al coche.
  const { itv, insurance, tax } = carExpiries(car);
  const SCORE_WARN_DAYS = 30;

  if (itv.state === "expired") {
    factors.push({ label: "ITV caducada", penalty: PENALTY.itvExpired });
  } else if (itv.state !== "unknown" && itv.daysLeft! < SCORE_WARN_DAYS) {
    factors.push({ label: `ITV en ${itv.daysLeft} días`, penalty: PENALTY.itvSoon });
  }

  if (insurance.state === "expired") {
    factors.push({ label: "Seguro caducado", penalty: PENALTY.insuranceExpired });
  } else if (insurance.state !== "unknown" && insurance.daysLeft! < SCORE_WARN_DAYS) {
    factors.push({ label: `Seguro vence en ${insurance.daysLeft} días`, penalty: PENALTY.insuranceSoon });
  }

  // El impuesto solo penaliza cuando ya se ha pasado el año: que venza dentro
  // de tres semanas no es un problema del coche, es un recordatorio.
  if (tax.state === "expired") {
    factors.push({ label: "Impuesto de circulación pendiente", penalty: PENALTY.taxOverdue });
  }

  const total = factors.reduce((sum, f) => sum + f.penalty, 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - total)));
  const condition = conditionFor(score);

  factors.sort((a, b) => b.penalty - a.penalty);

  return {
    score,
    condition,
    label: CONDITION_LABEL[condition],
    summary: CONDITION_SUMMARY[condition],
    factors,
  };
}

// ── Historial mensual ─────────────────────────────────────────────
//
// Insights dibuja la evolución de la puntuación. No se puede reconstruir
// hacia atrás (haría falta el estado del coche en cada fecha pasada), así
// que se guarda una foto por mes. `recordCarScore` es idempotente: llamarla
// varias veces en el mismo mes solo actualiza la fila de ese mes.

function ensureScoreTable() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS car_score_history (
      car_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      score INTEGER NOT NULL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (car_id, month),
      FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
    );
  `);
}

/** Guarda (o refresca) la puntuación del mes en curso. */
export function recordCarScore(carId: number, score?: number): void {
  ensureScoreTable();
  const value = score ?? computeCarScore(carId).score;
  const month = new Date().toISOString().slice(0, 7);
  getDb()
    .prepare(
      `INSERT INTO car_score_history (car_id, month, score) VALUES (?,?,?)
       ON CONFLICT(car_id, month) DO UPDATE SET score=excluded.score, recorded_at=datetime('now')`,
    )
    .run(carId, month, value);
}

/** Serie de puntuaciones de los últimos `months` meses, del más antiguo al
 *  más reciente. El mes en curso siempre aparece, aunque aún no se hubiera
 *  guardado, para que el gráfico termine en el valor que el usuario ve
 *  arriba en grande. */
export function getScoreHistory(
  carId: number,
  months = 12,
): { month: string; score: number }[] {
  ensureScoreTable();
  const rows = getDb()
    .prepare(
      `SELECT month, score FROM car_score_history
       WHERE car_id=? AND month >= strftime('%Y-%m', date('now', '-${months} months'))
       ORDER BY month ASC`,
    )
    .all(carId) as { month: string; score: number }[];

  const current = new Date().toISOString().slice(0, 7);
  if (!rows.some((r) => r.month === current)) {
    rows.push({ month: current, score: computeCarScore(carId).score });
  }
  return rows;
}
