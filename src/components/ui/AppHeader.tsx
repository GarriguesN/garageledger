"use client";

// Cabecera de pantalla. El mockup usa dos alineaciones y nunca mezcla:
//
//   · align="center" → hay navegación a la izquierda (☰ o ←) y el título va
//     centrado: Garaje (1), Detalle (2), Detalle mantenimiento (11).
//   · align="left"   → el título es el protagonista y las acciones van a la
//     derecha: Gastos (5), Actividad (6), Mantenimiento (7), Perfil (10).
//
// Las acciones son siempre botones de icono de 44×44 (área táctil mínima)
// aunque el icono dibuje 20px.

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { duration, easing } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";
import AppIcon from "./AppIcon";
import { cn } from "./cn";

export interface HeaderAction {
  icon: IconName;
  label: string;
  onClick?: () => void;
  href?: string;
  /** Punto rojo de aviso (campana con notificaciones pendientes). */
  badge?: boolean;
}

export interface AppHeaderProps {
  title?: React.ReactNode;
  /** Segunda línea bajo el título (versión/pastilla del mockup 2). */
  subtitle?: React.ReactNode;
  align?: "left" | "center";
  /** Muestra ← y vuelve atrás. Si es string, navega a esa ruta. */
  back?: boolean | string;
  /** Control libre a la izquierda (el ☰ del garaje). */
  leading?: HeaderAction;
  actions?: HeaderAction[];
  /** Control propio a la derecha, después de las acciones. Es lo que permite
   *  poner ahí algo que no es un botón suelto —el menú de los tres puntos del
   *  vehículo, que despliega editar y archivar. */
  trailing?: React.ReactNode;
  /** Fija la cabecera al hacer scroll. */
  sticky?: boolean;
  className?: string;
}

function IconButton({ action }: { action: HeaderAction }) {
  const { icon, label, onClick, href, badge } = action;
  const inner = (
    <span className="relative inline-flex size-11 items-center justify-center text-text">
      <AppIcon name={icon} size="lg" />
      {badge && (
        <span
          aria-hidden="true"
          className="absolute right-2.5 top-2.5 size-2 rounded-full bg-primary ring-2 ring-background"
        />
      )}
    </span>
  );

  const press = {
    whileTap: { scale: 0.9 },
    transition: { duration: duration.press, ease: easing.out },
  };

  if (href) {
    return (
      <motion.span {...press} className="inline-flex">
        <Link href={href} aria-label={label} className="inline-flex">
          {inner}
        </Link>
      </motion.span>
    );
  }
  return (
    <motion.button {...press} type="button" onClick={onClick} aria-label={label}>
      {inner}
    </motion.button>
  );
}

export default function AppHeader({
  title,
  subtitle,
  align = "left",
  back,
  leading,
  actions = [],
  trailing,
  sticky = true,
  className,
}: AppHeaderProps) {
  const router = useRouter();

  const backAction: HeaderAction | null = back
    ? {
        icon: "back",
        label: "Volver",
        ...(typeof back === "string" ? { href: back } : { onClick: () => router.back() }),
      }
    : null;

  const left = backAction ?? leading ?? null;
  const centered = align === "center";

  return (
    <header
      className={cn(
        "safe-top z-30 bg-background",
        sticky && "sticky top-0",
        className,
      )}
    >
      <div className="flex min-h-14 items-center gap-1 px-2">
        {/* El hueco izquierdo se reserva siempre en modo centrado para que el
            título quede realmente centrado aunque no haya botón. */}
        {left ? <IconButton action={left} /> : centered ? <span className="size-11" /> : null}

        <div className={cn("min-w-0 flex-1", centered ? "text-center" : "pl-2")}>
          {title && (
            <h1
              className={cn(
                "truncate font-bold text-text",
                centered ? "text-title" : "text-heading",
              )}
            >
              {title}
            </h1>
          )}
          {subtitle && <div className="mt-0.5 flex justify-center">{subtitle}</div>}
        </div>

        <div className="flex items-center">
          {actions.map((a) => (
            <IconButton key={a.label} action={a} />
          ))}
          {trailing}
          {/* Equilibra el hueco izquierdo cuando el título va centrado. */}
          {centered && actions.length === 0 && !trailing && <span className="size-11" />}
        </div>
      </div>
    </header>
  );
}
