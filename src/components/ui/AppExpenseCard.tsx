"use client";

// Entrada de gasto (mockup 6, dentro del timeline, y mockup 5 en el
// historial): chip, título, descripción, importe a la derecha y una segunda
// línea con el kilometraje o la fecha.

import { motion } from "framer-motion";
import { duration, easing, type AccentToken } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";
import AppIconChip from "./AppIconChip";
import { cn } from "./cn";

export interface AppExpenseCardProps {
  icon: IconName;
  accent?: AccentToken;
  title: string;
  /** "40 L · Repsol", "Varios", "Mapfre". */
  description?: string;
  /** Importe ya formateado: "53 €". */
  amount: string;
  /** Segunda línea a la derecha: "132.870 km" o la fecha. */
  meta?: string;
  onClick?: () => void;
  className?: string;
}

export default function AppExpenseCard({
  icon,
  accent = "green",
  title,
  description,
  amount,
  meta,
  onClick,
  className,
}: AppExpenseCardProps) {
  const body = (
    <>
      <AppIconChip icon={icon} accent={accent} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-semibold text-text">{title}</span>
        {description && (
          <span className="mt-0.5 block truncate text-caption text-text-muted">{description}</span>
        )}
      </span>
      <span className="shrink-0 text-right">
        <span className="tabular block text-body font-bold text-text">{amount}</span>
        {meta && <span className="tabular mt-0.5 block text-caption text-text-muted">{meta}</span>}
      </span>
    </>
  );

  const classes = cn(
    "flex w-full items-center gap-3 rounded-card border border-border bg-surface p-3 text-left shadow-card",
    className,
  );

  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.985 }}
        transition={{ duration: duration.card, ease: easing.out }}
        className={classes}
      >
        {body}
      </motion.button>
    );
  }
  return <div className={classes}>{body}</div>;
}
