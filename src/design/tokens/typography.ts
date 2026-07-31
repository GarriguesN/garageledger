// Cinco tamaños, cuatro pesos. No hay un sexto tamaño: si algo "necesita"
// uno, es que está mal mapeado a la jerarquía del mockup.
//
// Los tamaños van en rem para respetar el tamaño de fuente del sistema
// (accesibilidad: dynamic type). 1rem = 16px por defecto.

export const fontFamily =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const fontSize = {
  /** Cifras protagonistas: "182 €", "94", "6.3". */
  display: "1.75rem", // 28px
  /** Título de pantalla: "Gastos", "Actividad", "Garaje". */
  heading: "1.375rem", // 22px
  /** Título de tarjeta / nombre de vehículo. */
  title: "1.0625rem", // 17px
  /** Texto de fila, valores, etiquetas de botón. */
  body: "0.9375rem", // 15px
  /** Metadatos, etiquetas del navbar, badges. */
  caption: "0.75rem", // 12px
} as const;

export const lineHeight = {
  display: "2.125rem", // 34px
  heading: "1.75rem", // 28px
  title: "1.5rem", // 24px
  body: "1.375rem", // 22px
  caption: "1rem", // 16px
} as const;

export const fontWeight = {
  bold: 700,
  semibold: 600,
  medium: 500,
  regular: 400,
} as const;

export type FontSizeToken = keyof typeof fontSize;
export type FontWeightToken = keyof typeof fontWeight;

/** Los pares tamaño+interlineado que consume <AppText>. Tenerlos juntos evita
 *  que alguien combine `display` con el interlineado de `body`. */
export const textStyles = {
  display: { fontSize: fontSize.display, lineHeight: lineHeight.display },
  heading: { fontSize: fontSize.heading, lineHeight: lineHeight.heading },
  title: { fontSize: fontSize.title, lineHeight: lineHeight.title },
  body: { fontSize: fontSize.body, lineHeight: lineHeight.body },
  caption: { fontSize: fontSize.caption, lineHeight: lineHeight.caption },
} as const;

/** Cifras tabulares para columnas de importes y kilómetros: sin esto, los
 *  números "bailan" al actualizarse porque cada dígito tiene otro ancho. */
export const tabularNums = "tabular-nums";
