// Catálogo de categorías de gasto: las 8 casillas del asistente "Añadir
// gasto" (pantalla 3 del mockup) más las que solo existen en datos antiguos.
//
// Compatibilidad: los ids que ya usaba la app se conservan tal cual
// ("carburante", "mantenimiento", "seguro", "impuestos"…) para no migrar la
// tabla de gastos — y porque metrics.ts consulta tipo_id='carburante' y
// tipo_id='mantenimiento_diy' directamente. Los ids retirados se resuelven
// con LEGACY_TIPO_ID_ALIASES, de modo que un gasto de 2024 con tipo_id
// "peajes" se pinta con el icono y el color de "Peaje / Parking" sin tocar
// la BD.

import type { IconName } from "@/design/tokens/icons";
import type { AccentToken } from "@/design/tokens";

export interface ExpenseCategory {
  /** Id estable — se persiste en expenses.tipo_id. */
  id: string;
  /** Etiqueta visible, tal cual aparece en el mockup. */
  label: string;
  /** Etiqueta corta para leyendas de gráficos y filas estrechas. */
  shortLabel: string;
  icon: IconName;
  accent: AccentToken;
  /** Si false, no aparece en la rejilla del asistente: solo existe para
   *  pintar gastos históricos. */
  selectable: boolean;
  /** Formulario que abre al elegirla. "fuel" tiene campos propios
   *  (litros, precio/L, estación); el resto comparte el genérico. */
  form: "fuel" | "generic" | "maintenance" | "document";
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    id: "carburante",
    label: "Combustible",
    shortLabel: "Combustible",
    icon: "fuel",
    accent: "green",
    selectable: true,
    form: "fuel",
  },
  {
    id: "mantenimiento",
    label: "Mantenimiento",
    shortLabel: "Mantenimiento",
    icon: "wrench",
    accent: "orange",
    selectable: true,
    form: "maintenance",
  },
  {
    id: "reparacion",
    label: "Gasto / Reparación",
    shortLabel: "Reparación",
    icon: "euro",
    accent: "primary",
    selectable: true,
    form: "generic",
  },
  {
    id: "neumaticos",
    label: "Neumáticos",
    shortLabel: "Neumáticos",
    icon: "tire",
    accent: "purple",
    selectable: true,
    form: "generic",
  },
  {
    id: "seguro",
    label: "Seguro",
    shortLabel: "Seguro",
    icon: "shield",
    accent: "blue",
    selectable: true,
    form: "generic",
  },
  {
    id: "peaje_parking",
    label: "Peaje / Parking",
    shortLabel: "Parking / Peajes",
    icon: "parking",
    accent: "orange",
    selectable: true,
    form: "generic",
  },
  {
    id: "documento",
    label: "Documento",
    shortLabel: "Documento",
    icon: "document",
    accent: "purple",
    selectable: true,
    form: "document",
  },
  {
    id: "pieza",
    label: "Pieza / Accesorio",
    shortLabel: "Piezas",
    icon: "part",
    accent: "cyan",
    selectable: true,
    form: "generic",
  },

  // ── Solo para datos históricos ────────────────────────────────────
  {
    id: "impuestos",
    label: "Impuestos",
    shortLabel: "Impuestos",
    icon: "tax",
    accent: "purple",
    selectable: false,
    form: "generic",
  },
  {
    id: "mantenimiento_diy",
    label: "Mantenimiento (DIY)",
    shortLabel: "Mantenimiento",
    icon: "wrench",
    accent: "orange",
    selectable: false,
    form: "maintenance",
  },
  {
    id: "otros",
    label: "Otros",
    shortLabel: "Otros",
    icon: "receipt",
    accent: "blue",
    selectable: false,
    form: "generic",
  },
];

export const EXPENSE_CATEGORY_MAP: Record<string, ExpenseCategory> =
  Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.id, c]));

/** Las 8 casillas de la rejilla del asistente, en el orden del mockup. */
export const SELECTABLE_CATEGORIES = EXPENSE_CATEGORIES.filter((c) => c.selectable);

/** Ids retirados → id vigente. Permite pintar gastos antiguos con el
 *  catálogo nuevo sin escribir en la BD. */
const LEGACY_TIPO_ID_ALIASES: Record<string, string> = {
  parking: "peaje_parking",
  peajes: "peaje_parking",
  itv: "impuestos",
  tuning: "pieza",
  lavado: "otros",
};

/** Etiquetas antiguas (columna `tipo`, texto libre) → id. Solo se usa como
 *  último recurso para filas anteriores a que existiera `tipo_id`. */
const LEGACY_LABEL_ALIASES: Record<string, string> = {
  "carburante": "carburante",
  "mantenimiento (taller)": "mantenimiento",
  "mantenimiento (diy)": "mantenimiento_diy",
  "tuning": "pieza",
  "seguro": "seguro",
  "itv": "impuestos",
  "impuestos": "impuestos",
  "parking": "peaje_parking",
  "peajes": "peaje_parking",
  "lavado": "otros",
  "otros": "otros",
};

const FALLBACK = EXPENSE_CATEGORY_MAP.otros;

/** Resuelve la categoría de un gasto. Nunca devuelve undefined: un gasto sin
 *  categoría reconocible se pinta como "Otros" en lugar de romper la fila. */
export function resolveCategory(
  tipoId: string | null | undefined,
  tipoLabel?: string | null,
): ExpenseCategory {
  if (tipoId) {
    const direct = EXPENSE_CATEGORY_MAP[tipoId];
    if (direct) return direct;
    const aliased = LEGACY_TIPO_ID_ALIASES[tipoId];
    if (aliased && EXPENSE_CATEGORY_MAP[aliased]) return EXPENSE_CATEGORY_MAP[aliased];
  }
  if (tipoLabel) {
    const byLabel = LEGACY_LABEL_ALIASES[tipoLabel.toLowerCase().trim()];
    if (byLabel && EXPENSE_CATEGORY_MAP[byLabel]) return EXPENSE_CATEGORY_MAP[byLabel];
  }
  return FALLBACK;
}

export function isValidCategoryId(v: unknown): boolean {
  return typeof v === "string" && v in EXPENSE_CATEGORY_MAP;
}
