// Punto de entrada único del sistema de diseño.
//
//   import { colors, spacing, radius } from "@/design/tokens";
//
// `globals.css` republica estos mismos valores como CSS custom properties
// (--color-*, --radius-*, …) para poder usarlos desde clases de Tailwind.
// scripts/test-design-tokens.ts comprueba que los dos lados coinciden, así
// que da igual cuál consuma cada componente: nunca pueden divergir.

export { colors, accents, accentDim, hexToRgba, statusColors } from "./colors";
export type { ColorToken, AccentToken, StatusToken } from "./colors";

export { spacing, screenPaddingX, bottomNavHeight, headerHeight, fabOverlap, minTouchTarget } from "./spacing";
export type { SpacingToken } from "./spacing";

export { radius } from "./radius";
export type { RadiusToken } from "./radius";

export { shadows, fabGlow } from "./shadows";
export type { ShadowToken } from "./shadows";

export { fontFamily, fontSize, lineHeight, fontWeight, textStyles, tabularNums } from "./typography";
export type { FontSizeToken, FontWeightToken } from "./typography";

export {
  duration, durationMs, easing, easingCss, fabSpring,
  pressable, pressableCard, staggerContainer, staggerItem, modalSheet, fadeIn,
} from "./animations";

export { iconSize, strokeWidth, ICONS, resolveIcon } from "./icons";
export type { IconSizeToken, IconName, LucideIcon } from "./icons";
