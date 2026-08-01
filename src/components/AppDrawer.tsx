"use client";

// Cajón de navegación global (el ☰ del garaje). Fuera del vehículo no hay
// barra inferior —así lo pide el mockup—, así que este cajón es el único
// camino a Vehículos, Perfil y Notificaciones.

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { X } from "@/design/tokens/icons";
import type { IconName } from "@/design/tokens/icons";
import { duration, easing, iconSize, strokeWidth } from "@/design/tokens";
import { AppListTile, AppDivider } from "@/components/ui";

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Garaje", icon: "home" },
  { href: "/vehiculos", label: "Mis vehículos", icon: "car" },
  { href: "/notificaciones", label: "Notificaciones", icon: "bell" },
  { href: "/perfil", label: "Perfil y ajustes", icon: "settings" },
];

export interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function AppDrawer({ open, onClose }: AppDrawerProps) {
  const pathname = usePathname();

  // Navegar cierra el cajón: sin esto se queda abierto encima de la pantalla
  // nueva porque el componente no se desmonta al cambiar de ruta.
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration.press }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        >
          <motion.nav
            role="dialog"
            aria-modal="true"
            aria-label="Navegación"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: duration.page, ease: easing.out }}
            onClick={(e) => e.stopPropagation()}
            className="safe-top safe-bottom flex h-dvh w-72 max-w-full flex-col border-r border-border bg-surface px-4"
          >
            <div className="flex min-h-14 items-center justify-between">
              <span className="text-title font-bold text-text">GarageLedger</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar menú"
                className="inline-flex size-11 items-center justify-center text-text"
              >
                <X size={iconSize.lg} strokeWidth={strokeWidth.default} />
              </button>
            </div>

            <AppDivider className="mb-2" />

            <ul>
              {LINKS.map((link) => (
                <li key={link.href}>
                  <AppListTile icon={link.icon} label={link.label} href={link.href} />
                </li>
              ))}
            </ul>
          </motion.nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
