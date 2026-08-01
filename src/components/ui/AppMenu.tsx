"use client";

// Menú desplegable de un botón de icono — el de los tres puntos de la
// cabecera del vehículo.
//
// Se abre anclado a su botón, se cierra con Escape, tocando fuera o al
// elegir. El fondo que captura el toque es un elemento propio y no un
// listener en `document`: así el primer toque fuera cierra el menú y no
// activa además lo que hubiera debajo.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { colors, duration, easing, radius, shadows } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";
import AppIcon from "./AppIcon";
import { cn } from "./cn";

export interface MenuItem {
  label: string;
  icon?: IconName;
  href?: string;
  onClick?: () => void;
  /** Acción de riesgo (archivar, borrar): se pinta en rojo. */
  destructive?: boolean;
}

export interface AppMenuProps {
  items: MenuItem[];
  /** Icono del botón que abre el menú. */
  icon?: IconName;
  /** Etiqueta accesible del botón. */
  label?: string;
  className?: string;
}

export default function AppMenu({
  items,
  icon = "more",
  label = "Opciones",
  className,
}: AppMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className={cn("relative", className)}>
      <motion.button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        whileTap={{ scale: 0.9 }}
        transition={{ duration: duration.press, ease: easing.out }}
        className="inline-flex size-11 items-center justify-center text-text"
      >
        <AppIcon name={icon} size="lg" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />

            <motion.div
              role="menu"
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: duration.press, ease: easing.out }}
              className="absolute right-0 z-50 mt-1 min-w-48 overflow-hidden border border-border bg-surface p-1"
              style={{
                transformOrigin: "top right",
                borderRadius: radius.input,
                boxShadow: shadows.floating,
              }}
            >
              {items.map((item) => {
                const content = (
                  <>
                    {item.icon && <AppIcon name={item.icon} />}
                    <span className="flex-1 truncate">{item.label}</span>
                  </>
                );
                const classes = "flex min-h-11 w-full items-center gap-3 rounded-chip px-3 text-left text-body font-medium";
                const color = item.destructive ? colors.danger : colors.text;

                if (item.href) {
                  return (
                    <Link
                      key={item.label}
                      role="menuitem"
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={classes}
                      style={{ color }}
                    >
                      {content}
                    </Link>
                  );
                }
                return (
                  <button
                    key={item.label}
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      item.onClick?.();
                    }}
                    className={classes}
                    style={{ color }}
                  >
                    {content}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
