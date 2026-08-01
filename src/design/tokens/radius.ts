// Radios de esquina. Uno por familia de componente — no hay valores libres.

export const radius = {
  /** Tarjetas y sheets. */
  card: "24px",
  /** Botones. */
  button: "18px",
  /** Inputs, selects, date pickers. */
  input: "16px",
  /** Imágenes (foto del vehículo, previsualizaciones). */
  image: "20px",
  /** Chips de icono y contenedores pequeños dentro de una tarjeta. */
  chip: "12px",
  /** Píldoras: badges, FAB, indicadores circulares. */
  pill: "999px",
} as const;

export type RadiusToken = keyof typeof radius;
