"use client";

// Fila de mantenimiento (mockup 7 y 11): chip, nombre, periodicidad y la
// línea "en 1.420 km / o en 45 días". El color del estado tiñe el chip y,
// cuando está vencido, también los textos de la línea inferior — el mockup
// no usa fondos rojos, solo texto rojo, para no gritar en toda la lista.

import { motion } from "framer-motion";
import Link from "next/link";
import { resolveIcon, type IconName } from "@/design/tokens/icons";
import {
  iconSize, strokeWidth, statusColors, duration, easing, type StatusToken,
} from "@/design/tokens";
import AppIconChip from "./AppIconChip";
import { cn } from "./cn";

/** Traducción de estado a acento del chip. */
const STATUS_ACCENT = {
  ok: "green",
  warning: "orange",
  critical: "danger",
  neutral: "blue",
} as const;

export interface AppMaintenanceCardProps {
  icon: IconName;
  title: string;
  /** "Cada 10.000 km / 12 meses" */
  frequency?: string;
  /** Izquierda de la línea inferior: "en 1.420 km" o "Vencido". */
  remaining?: string;
  /** Derecha de la línea inferior: "o en 45 días", "hace 13 días". */
  remainingDetail?: string;
  status?: StatusToken;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export default function AppMaintenanceCard({
  icon,
  title,
  frequency,
  remaining,
  remainingDetail,
  status = "ok",
  href,
  onClick,
  className,
}: AppMaintenanceCardProps) {
  const ChevronRight = resolveIcon("chevronRight");
  const isLate = status === "critical";
  const lineColor = isLate ? statusColors.critical : undefined;

  const body = (
    <>
      <AppIconChip icon={icon} accent={STATUS_ACCENT[status]} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-semibold text-text">{title}</span>
        {frequency && (
          <span className="mt-0.5 block truncate text-caption text-text-muted">{frequency}</span>
        )}
        {(remaining || remainingDetail) && (
          <span className="mt-1.5 flex items-baseline justify-between gap-3">
            <span
              className="tabular truncate text-caption font-semibold"
              style={{ color: lineColor }}
            >
              {remaining}
            </span>
            {remainingDetail && (
              <span
                className="tabular shrink-0 text-caption text-text-secondary"
                style={{ color: lineColor }}
              >
                {remainingDetail}
              </span>
            )}
          </span>
        )}
      </span>

      {(href || onClick) && (
        <ChevronRight
          size={iconSize.md}
          strokeWidth={strokeWidth.default}
          aria-hidden="true"
          className="shrink-0 self-center text-text-muted"
        />
      )}
    </>
  );

  const classes = cn(
    "flex w-full items-start gap-3 rounded-card border border-border bg-surface p-4 text-left shadow-card",
    className,
  );
  const press = {
    whileTap: { scale: 0.985 },
    transition: { duration: duration.card, ease: easing.out },
  };

  if (href) {
    return (
      <motion.div {...press}>
        <Link href={href} className={classes}>
          {body}
        </Link>
      </motion.div>
    );
  }
  if (onClick) {
    return (
      <motion.button type="button" onClick={onClick} className={classes} {...press}>
        {body}
      </motion.button>
    );
  }
  return <div className={classes}>{body}</div>;
}
