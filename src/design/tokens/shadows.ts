// Dos niveles de sombra y nada más.
//
// En tema oscuro una sombra negra sobre fondo casi negro es invisible, así
// que la elevación se lee por el borde de 1px + una sombra ambiental amplia.
// Por eso `card` combina sombra y no depende del contraste puro.

import { hexToRgba, colors } from "./colors";

export const shadows = {
  /** Elevación de reposo de una tarjeta. */
  card: "0 1px 2px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.24)",
  /** Elementos flotantes: FAB, modales, navbar sobre contenido. */
  floating: "0 8px 24px rgba(0, 0, 0, 0.48), 0 2px 8px rgba(0, 0, 0, 0.32)",
} as const;

export type ShadowToken = keyof typeof shadows;

/** Halo del FAB: el rojo de marca proyecta color, no negro (mockup). */
export const fabGlow = `0 6px 20px ${hexToRgba(colors.primary, 0.4)}`;
