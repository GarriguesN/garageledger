"use client";

// Contenedor base: superficie + borde + radio 24 + sombra de tarjeta.
// Si recibe `onClick` (o `href`) se vuelve pulsable y anima la elevación.

import { motion } from "framer-motion";
import Link from "next/link";
import { duration, easing } from "@/design/tokens";
import { cn } from "./cn";

export interface AppCardProps {
  children: React.ReactNode;
  /** Sin padding interno: para tarjetas cuyo contenido llega hasta el borde
   *  (la foto del vehículo, por ejemplo). */
  flush?: boolean;
  onClick?: () => void;
  href?: string;
  className?: string;
  /** Etiqueta accesible cuando la tarjeta entera es el control. */
  ariaLabel?: string;
}

const base = "bg-surface border border-border rounded-card shadow-card";

export default function AppCard({
  children,
  flush = false,
  onClick,
  href,
  className,
  ariaLabel,
}: AppCardProps) {
  const classes = cn(base, flush ? "overflow-hidden" : "p-4", className);

  if (href) {
    return (
      <motion.div
        whileTap={{ scale: 0.985 }}
        transition={{ duration: duration.card, ease: easing.out }}
      >
        <Link href={href} aria-label={ariaLabel} className={cn(classes, "block")}>
          {children}
        </Link>
      </motion.div>
    );
  }

  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        whileTap={{ scale: 0.985 }}
        transition={{ duration: duration.card, ease: easing.out }}
        className={cn(classes, "block w-full text-left")}
      >
        {children}
      </motion.button>
    );
  }

  return <div className={classes}>{children}</div>;
}
