"use client";

// Entrada de gasto (mockup 6, dentro del timeline, y mockup 5 en el
// historial): chip, título, descripción, importe a la derecha y una segunda
// línea con el kilometraje o la fecha.

import Link from "next/link";
import { motion } from "framer-motion";
import { colors, duration, easing, iconSize, strokeWidth, type AccentToken } from "@/design/tokens";
import { ChevronRight, type IconName } from "@/design/tokens/icons";
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
  /** Convierte la tarjeta en enlace al detalle del gasto. */
  href?: string;
  /** Miniatura del ticket, si el gasto tiene una foto adjunta. */
  thumbnailUrl?: string | null;
  /** Chevron a la derecha en las tarjetas que abren algo. */
  chevron?: boolean;
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
  href,
  thumbnailUrl,
  chevron = false,
  className,
}: AppExpenseCardProps) {
  const body = (
    <>
      {thumbnailUrl ? (
        // La miniatura sustituye al chip: el ticket identifica el gasto mejor
        // que el icono de su categoría, que ya se repite en toda la lista.
        <span
          className="size-10 shrink-0 overflow-hidden rounded-chip border border-border"
          style={{ backgroundColor: colors.surfaceElevated }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbnailUrl} alt="" aria-hidden="true" className="size-full object-cover" />
        </span>
      ) : (
        <AppIconChip icon={icon} accent={accent} />
      )}
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
      {chevron && (
        <ChevronRight
          size={iconSize.md}
          strokeWidth={strokeWidth.default}
          aria-hidden="true"
          className="-ml-1 shrink-0 text-text-muted"
        />
      )}
    </>
  );

  const classes = cn(
    "flex w-full items-center gap-3 rounded-card border border-border bg-surface p-3 text-left shadow-card",
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
      <motion.button type="button" onClick={onClick} {...press} className={classes}>
        {body}
      </motion.button>
    );
  }
  return <div className={classes}>{body}</div>;
}
