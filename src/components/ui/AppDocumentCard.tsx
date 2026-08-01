"use client";

// Fila de documento (mockup 8): chip, nombre, estado de caducidad y badge.
// El badge y el texto de caducidad comparten acento para que un vistazo
// baste: verde vigente, ámbar próximo, rojo caducado.

import { motion } from "framer-motion";
import { accents, duration, easing, type AccentToken } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";
import AppIconChip from "./AppIconChip";
import AppBadge from "./AppBadge";
import { cn } from "./cn";

export interface AppDocumentCardProps {
  icon: IconName;
  name: string;
  /** "Válido hasta 12 Ene 2027", "Caduca en 24 días", "Verificado". */
  detail?: string;
  status?: { label: string; accent: AccentToken };
  /** Tiñe el texto de detalle con el acento del estado (solo si urge). */
  highlightDetail?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function AppDocumentCard({
  icon,
  name,
  detail,
  status,
  highlightDetail = false,
  onClick,
  className,
}: AppDocumentCardProps) {
  const body = (
    <>
      <AppIconChip icon={icon} accent={status?.accent ?? "blue"} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-semibold text-text">{name}</span>
        {detail && (
          <span
            className="mt-0.5 block truncate text-caption"
            style={{
              color: highlightDetail && status ? accents[status.accent] : undefined,
            }}
          >
            <span className={cn(!(highlightDetail && status) && "text-text-muted")}>{detail}</span>
          </span>
        )}
      </span>
      {status && (
        <AppBadge accent={status.accent} className="shrink-0 self-center">
          {status.label}
        </AppBadge>
      )}
    </>
  );

  const classes = cn(
    "flex w-full items-center gap-3 rounded-card border border-border bg-surface p-4 text-left shadow-card",
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
