"use client";

// Botón flotante circular. Con `actions` despliega un menú en muelle
// (mockup 1: el [+] del garaje). Sin ellas es un botón simple.

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  colors, fabGlow, fabSpring, duration, easing, radius,
} from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";
import AppIcon from "./AppIcon";
import { cn } from "./cn";

export interface FabAction {
  label: string;
  icon: IconName;
  onClick?: () => void;
  href?: string;
}

export interface AppFloatingButtonProps {
  label: string;
  icon?: IconName;
  onClick?: () => void;
  href?: string;
  actions?: FabAction[];
  /** `inline` lo coloca en el flujo (cabecera del garaje); `fixed` lo ancla
   *  abajo a la derecha por encima del contenido. */
  position?: "inline" | "fixed";
  size?: "md" | "lg";
  className?: string;
}

const BOX = { md: 44, lg: 56 } as const;

export default function AppFloatingButton({
  label,
  icon = "plus",
  onClick,
  href,
  actions,
  position = "inline",
  size = "md",
  className,
}: AppFloatingButtonProps) {
  const [open, setOpen] = useState(false);
  const box = BOX[size];
  const hasMenu = !!actions?.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const button = (
    <motion.button
      type="button"
      onClick={hasMenu ? () => setOpen((v) => !v) : onClick}
      aria-label={open ? "Cerrar menú" : label}
      aria-expanded={hasMenu ? open : undefined}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: duration.press, ease: easing.out }}
      className="flex items-center justify-center rounded-pill text-white"
      style={{ width: box, height: box, backgroundColor: colors.primary, boxShadow: fabGlow }}
    >
      <motion.span
        animate={{ rotate: open ? 45 : 0 }}
        transition={fabSpring}
        className="flex items-center justify-center"
      >
        <AppIcon name={open ? "close" : icon} size={size === "lg" ? "xl" : "lg"} bold />
      </motion.span>
    </motion.button>
  );

  const trigger = href ? (
    <motion.span whileTap={{ scale: 0.94 }} className="inline-flex">
      <Link
        href={href}
        aria-label={label}
        className="flex items-center justify-center rounded-pill text-white"
        style={{ width: box, height: box, backgroundColor: colors.primary, boxShadow: fabGlow }}
      >
        <AppIcon name={icon} size={size === "lg" ? "xl" : "lg"} bold />
      </Link>
    </motion.span>
  ) : (
    button
  );

  return (
    <div
      className={cn(
        "relative",
        position === "fixed" && "fixed bottom-6 right-4 z-40 safe-bottom",
        className,
      )}
    >
      <AnimatePresence>
        {open && hasMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration.press }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-0 bg-background/70 backdrop-blur-sm"
            />
            <motion.ul
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={{
                hidden: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
                show: { transition: { staggerChildren: 0.04 } },
              }}
              className="absolute right-0 z-10 flex flex-col items-end gap-2"
              style={{ bottom: box + 12 }}
            >
              {actions!.map((a) => {
                const item = (
                  <span
                    className="flex items-center gap-3 bg-surface px-4 py-3 text-body font-semibold text-text shadow-floating"
                    style={{ borderRadius: radius.button }}
                  >
                    <AppIcon name={a.icon} />
                    {a.label}
                  </span>
                );
                return (
                  <motion.li
                    key={a.label}
                    variants={{
                      hidden: { opacity: 0, y: 12, scale: 0.94 },
                      show: { opacity: 1, y: 0, scale: 1, transition: fabSpring },
                    }}
                  >
                    {a.href ? (
                      <Link href={a.href} onClick={() => setOpen(false)}>
                        {item}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          a.onClick?.();
                        }}
                      >
                        {item}
                      </button>
                    )}
                  </motion.li>
                );
              })}
            </motion.ul>
          </>
        )}
      </AnimatePresence>

      <div className="relative z-10">{trigger}</div>
    </div>
  );
}
