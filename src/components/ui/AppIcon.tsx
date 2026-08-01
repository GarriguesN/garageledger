// Único punto donde un nombre de icono se convierte en el componente que lo
// dibuja.
//
// Existe por dos motivos. El primero es de arquitectura: las pantallas son
// Server Components y las tarjetas son de cliente, y React no puede pasar una
// función a través de esa frontera —pero un string sí—, así que los iconos
// viajan como nombre.
//
// El segundo es de React: resolver el componente dentro del cuerpo de otro
// (`const Icon = resolveIcon(name)` y luego `<Icon/>`) es el patrón que la
// regla `react-hooks/static-components` señala, porque si la identidad del
// componente cambiara entre renders React desmontaría y volvería a montar el
// subárbol. Centralizándolo aquí, la resolución ocurre en un solo sitio y
// contra un mapa de módulo cuyas referencias son estables.

import { ICONS, iconSize, strokeWidth, type IconName, type IconSizeToken } from "@/design/tokens";

export interface AppIconProps {
  name: IconName;
  /** Token de tamaño, o un número de píxeles si hace falta uno concreto. */
  size?: IconSizeToken | number;
  color?: string;
  /** Trazo grueso: el "+" del FAB. */
  bold?: boolean;
  className?: string;
  /** Los iconos son decorativos salvo que se diga lo contrario: el texto de
   *  al lado ya dice lo que significan. */
  title?: string;
}

export default function AppIcon({
  name,
  size = "md",
  color,
  bold = false,
  className,
  title,
}: AppIconProps) {
  const Glyph = ICONS[name] ?? ICONS.circleDot;
  const px = typeof size === "number" ? size : iconSize[size];

  return (
    <Glyph
      size={px}
      strokeWidth={bold ? strokeWidth.bold : strokeWidth.default}
      color={color}
      className={className}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      role={title ? "img" : undefined}
    />
  );
}
