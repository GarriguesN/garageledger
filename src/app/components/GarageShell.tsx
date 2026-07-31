"use client";

// Envoltura cliente de las pantallas sin barra inferior (Garaje, Vehículos,
// Perfil, Notificaciones): aporta la cabecera con ☰ y campana, y el cajón
// de navegación. El contenido lo sigue renderizando el Server Component,
// así que los datos no viajan a un componente cliente sin necesidad.

import { useState } from "react";
import { AppLayout, AppHeader } from "@/components/ui";
import AppDrawer from "@/components/AppDrawer";

export interface GarageShellProps {
  title: string;
  /** Pinta el punto rojo de la campana. */
  hasAlerts?: boolean;
  /** Acción a la derecha del título, además de la campana. */
  children: React.ReactNode;
}

export default function GarageShell({ title, hasAlerts = false, children }: GarageShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <AppLayout
        header={
          <AppHeader
            title={title}
            align="center"
            leading={{ icon: "menu", label: "Abrir menú", onClick: () => setDrawerOpen(true) }}
            actions={[
              {
                icon: "bell",
                label: hasAlerts ? "Notificaciones (hay avisos)" : "Notificaciones",
                href: "/notificaciones",
                badge: hasAlerts,
              },
            ]}
          />
        }
      >
        {children}
      </AppLayout>
      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
