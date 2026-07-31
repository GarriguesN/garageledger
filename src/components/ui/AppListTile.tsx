"use client";

// Fila de ajustes (mockup 10): icono, etiqueta, valor opcional a la derecha
// y chevron. Se usa también para cualquier lista de navegación simple.

import Link from "next/link";
import { motion } from "framer-motion";
import type { IconName } from "@/design/tokens/icons";
import { duration, easing } from "@/design/tokens";
import AppIcon from "./AppIcon";
import { cn } from "./cn";

export interface AppListTileProps {
  icon?: IconName;
  label: React.ReactNode;
  /** Texto gris antes del chevron ("3 vehículos", "Activados"). */
  value?: React.ReactNode;
  description?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  /** Oculta el chevron en filas que no navegan. */
  chevron?: boolean;
  /** Control propio a la derecha (interruptor); sustituye a valor+chevron. */
  trailing?: React.ReactNode;
  className?: string;
}

export default function AppListTile({
  icon,
  label,
  value,
  description,
  href,
  onClick,
  chevron = true,
  trailing,
  className,
}: AppListTileProps) {
  const interactive = !!(href || onClick);

  const content = (
    <>
      {icon && <AppIcon name={icon} className="shrink-0 text-text-secondary" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium text-text">{label}</span>
        {description && (
          <span className="mt-0.5 block truncate text-caption text-text-muted">{description}</span>
        )}
      </span>
      {trailing ?? (
        <>
          {value && <span className="shrink-0 text-caption text-text-secondary">{value}</span>}
          {interactive && chevron && (
            <AppIcon name="chevronRight" className="shrink-0 text-text-muted" />
          )}
        </>
      )}
    </>
  );

  const classes = cn("flex min-h-12 w-full items-center gap-3 py-3 text-left", className);

  if (href) {
    return (
      <motion.div whileTap={{ scale: 0.99 }} transition={{ duration: duration.press, ease: easing.out }}>
        <Link href={href} className={classes}>
          {content}
        </Link>
      </motion.div>
    );
  }
  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: duration.press, ease: easing.out }}
        className={classes}
      >
        {content}
      </motion.button>
    );
  }
  return <div className={classes}>{content}</div>;
}
