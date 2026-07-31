/** Une clases condicionales. Sin dependencias: la app no necesita la
 *  resolución de conflictos de tailwind-merge porque los componentes de
 *  `ui/` no reciben clases que pisen sus propios estilos base — reciben
 *  `className` para posicionarse (márgenes, ancho), no para repintarse.
 *
 *  Acepta cualquier valor para poder escribir `cond && "clase"` donde `cond`
 *  sea un ReactNode; solo se conservan las cadenas no vacías. */
export function cn(...parts: unknown[]): string {
  return parts.filter((p): p is string => typeof p === "string" && p.length > 0).join(" ");
}
