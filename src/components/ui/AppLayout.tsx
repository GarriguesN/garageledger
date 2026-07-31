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
    <div className="safe-x flex min-h-dvh flex-col bg-background">
      {header}
      <main
        className={cn(
          "mx-auto w-full max-w-2xl flex-1 px-4",
          hasBottomNav ? "pb-nav" : "safe-bottom pb-6",
          className,
        )}
      >
        {children}
      </main>
      {bottomNav}
    </div>
  );
}
