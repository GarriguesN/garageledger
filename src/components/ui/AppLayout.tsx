// Armazón de pantalla: cabecera + contenido + barra inferior opcional.
//
// Ancho máximo 2xl (672px): en móvil ocupa todo; en tablet (768) la columna
// se centra en lugar de estirarse, que es lo que pide el mockup —está
// diseñado como app móvil, no como panel de escritorio.

import { cn } from "./cn";

export interface AppLayoutProps {
  header?: React.ReactNode;
  children: React.ReactNode;
  /** Reserva el espacio de la barra inferior contextual. */
  hasBottomNav?: boolean;
  bottomNav?: React.ReactNode;
  className?: string;
}

export default function AppLayout({
  header,
  children,
  hasBottomNav = false,
  bottomNav,
  className,
}: AppLayoutProps) {
  return (
    <AppScreenFrame>
      {header}
      <AppScreenMain hasBottomNav={hasBottomNav} className={className}>
        {children}
      </AppScreenMain>
      {bottomNav}
    </AppScreenFrame>
  );
}

/** Marco exterior de una pantalla. Se expone suelto para las rutas del
 *  vehículo, donde el marco lo pone el layout compartido (que además monta la
 *  barra inferior) y la cabecera la pone cada pantalla: así la cabecera
 *  pegajosa ocupa todo el ancho en vez de quedar dentro del padding del main. */
export function AppScreenFrame({ children }: { children: React.ReactNode }) {
  return <div className="safe-x flex min-h-dvh flex-col bg-background">{children}</div>;
}

/** Columna de contenido: 16px de padding lateral y tope de 672px. */
export function AppScreenMain({
  children,
  hasBottomNav = false,
  className,
}: {
  children: React.ReactNode;
  hasBottomNav?: boolean;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-2xl flex-1 px-4",
        hasBottomNav ? "pb-nav" : "safe-bottom pb-6",
        className,
      )}
    >
      {children}
    </main>
  );
}
