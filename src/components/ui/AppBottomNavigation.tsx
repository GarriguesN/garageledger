"use client";

// Navbar contextual del vehículo. Solo existe dentro de /coches/[id]; fuera
// no hay barra inferior (mockup 1, 9 y 10).
//
// Cinco huecos, con el FAB en el centro sobresaliendo 16px por encima de la
// barra. Cada entrada es un enlace real —no un cambio de estado— para que el
// botón atrás del navegador y los enlaces profundos funcionen.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home, Activity, Wrench, FileText, Plus,
} from "@/design/tokens/icons";
import {
  iconSize, strokeWidth, colors, duration, easing, fabGlow,
} from "@/design/tokens";
import type { LucideIcon } from "@/design/tokens/icons";
import { cn } from "./cn";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Coincidencia exacta: "Resumen" es la raíz del coche y no debe quedar
   *  activa en todas sus subrutas. */
  exact?: boolean;
}

export interface AppBottomNavigationProps {
  carId: string | number;
  /** El [+] abre el asistente. Nada de menús intermedios: la primera
   *  pantalla del propio asistente ya es la lista de qué añadir. */
  onAdd: () => void;
}

export default function AppBottomNavigation({ carId, onAdd }: AppBottomNavigationProps) {
  const pathname = usePathname() || "";
  const base = `/coches/${carId}`;

  const left: NavItem[] = [
    { href: base, label: "Resumen", icon: Home, exact: true },
    { href: `${base}/actividad`, label: "Actividad", icon: Activity },
  ];
  const right: NavItem[] = [
    { href: `${base}/mantenimiento`, label: "Mantenimiento", icon: Wrench },
    { href: `${base}/documentos`, label: "Documentos", icon: FileText },
  ];

  function isActive(item: NavItem) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  function Item({ item }: { item: NavItem }) {
    const active = isActive(item);
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className="flex min-h-11 flex-col items-center justify-center gap-1"
        style={{ color: active ? colors.primary : colors.textSecondary }}
      >
        <Icon size={iconSize.md} strokeWidth={strokeWidth.default} />
        <span className="text-caption font-medium leading-none">{item.label}</span>
      </Link>
    );
  }

  return (
    <nav
      aria-label="Navegación del vehículo"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 safe-bottom",
        "border-t border-border bg-surface/95 backdrop-blur-md",
      )}
    >
      <div className="mx-auto grid h-16 max-w-2xl grid-cols-5 items-center px-2">
        {left.map((i) => (
          <Item key={i.href} item={i} />
        ))}

        <div className="flex justify-center">
          <motion.button
            type="button"
            onClick={onAdd}
            aria-label="Añadir"
            whileTap={{ scale: 0.94 }}
            transition={{ duration: duration.press, ease: easing.out }}
            className="flex size-14 items-center justify-center rounded-pill text-white"
            style={{ backgroundColor: colors.primary, marginTop: -16, boxShadow: fabGlow }}
          >
            <Plus size={iconSize.xl} strokeWidth={strokeWidth.bold} />
          </motion.button>
        </div>

        {right.map((i) => (
          <Item key={i.href} item={i} />
        ))}
      </div>
    </nav>
  );
}
