// Rejilla de 8px. La escala es cerrada: 4, 8, 12, 16, 24, 32, 40, 48.
// Cualquier otro valor de separación es un bug (lo caza el grep gate de
// scripts/test-design-tokens.ts).

export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
} as const;

export type SpacingToken = keyof typeof spacing;

/** Padding horizontal estándar de una pantalla (mockup: 16px a cada lado). */
export const screenPaddingX = spacing[4];

/** Alto de la barra de navegación inferior, sin contar el safe-area. */
export const bottomNavHeight = "64px";

/** Alto del header de pantalla. */
export const headerHeight = "56px";

/** Cuánto sobresale el FAB central por encima del navbar. */
export const fabOverlap = "16px";

/** Área táctil mínima accesible (WCAG 2.5.5 / HIG). */
export const minTouchTarget = "44px";
