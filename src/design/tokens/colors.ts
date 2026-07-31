// Paleta única de la app. Ningún componente define un color propio: si un
// color no está aquí, no existe. Los valores salen del mockup premium
// automotive (tema oscuro); `globals.css` los republica como CSS vars vía
// @theme y scripts/test-design-tokens.ts verifica que ambos no se separen.

export const colors = {
  // ── Base ────────────────────────────────────────────────────────
  /** Fondo de la app. */
  background: "#111214",
  /** Superficie de tarjetas y barras. */
  surface: "#191B1F",
  /** Superficie elevada: inputs, filas dentro de tarjeta, chips. */
  surfaceElevated: "#1F2228",
  /** Borde de 1px de tarjetas, inputs y separadores. */
  border: "#2A2D33",

  // ── Marca ───────────────────────────────────────────────────────
  /** Rojo de marca: FAB, botón primario, item activo del navbar. */
  primary: "#D63E3E",
  /** Estado :active/hover del primario. */
  primaryHover: "#BE3535",

  // ── Semánticos (categorías, estados, series de gráficos) ────────
  green: "#39D353",
  orange: "#F5A524",
  blue: "#4DA3FF",
  purple: "#9B6BFF",
  cyan: "#2DD4BF",
  danger: "#FF5A5A",

  // ── Texto ───────────────────────────────────────────────────────
  text: "#FFFFFF",
  textSecondary: "#A0A5AD",
  /* Sube a 4.95:1 sobre superficie. El #6B7280 anterior se quedaba en
     3.57:1, por debajo del AA de texto normal, y este tono se usa en
     metadatos de 12px — texto pequeño, justo donde más falta hace. */
  textMuted: "#828A96",
  /** Texto sobre superficies de color sólido (primario, badges llenos). */
  textOnColor: "#FFFFFF",
} as const;

export type ColorToken = keyof typeof colors;

/** Acentos que pueden pintar un icon-chip, un badge o una serie de gráfico.
 *  Se declara aparte de `colors` para que los catálogos (categorías de gasto,
 *  tipos de documento, estados de mantenimiento) referencien un token y no un
 *  hex suelto. */
export const accents = {
  primary: colors.primary,
  green: colors.green,
  orange: colors.orange,
  blue: colors.blue,
  purple: colors.purple,
  cyan: colors.cyan,
  danger: colors.danger,
} as const;

export type AccentToken = keyof typeof accents;

/** Fondo tenue de un acento — los cuadrados de icono del mockup son el
 *  acento al 12% sobre la superficie. Se calcula, no se hardcodea, para que
 *  cambiar un acento arrastre su versión tenue. */
export function accentDim(token: AccentToken, alpha = 0.12): string {
  return hexToRgba(accents[token], alpha);
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Estados de salud del vehículo y de tareas de mantenimiento. El mockup
 *  usa exactamente tres colores de estado: verde / ámbar / rojo. */
export const statusColors = {
  ok: colors.green,
  warning: colors.orange,
  critical: colors.danger,
  neutral: colors.textMuted,
} as const;

export type StatusToken = keyof typeof statusColors;
