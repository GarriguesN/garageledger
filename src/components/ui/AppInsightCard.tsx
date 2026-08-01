"use client";

// Tarjeta de observación: chip de icono, titular, explicación y una acción
// opcional.
//
// El titular lleva el dato ("El consumo ha mejorado un 8%") y la explicación
// de dónde sale ese dato. Una observación sin su origen es una opinión, y en
// una app de mantenimiento eso no sirve de nada.

import Link from "next/link";
import { motion } from "framer-motion";
import { duration, easing, type AccentToken } from "@/design/tokens";
import type { IconName } from "@/design/tokens/icons";
import AppIconChip from "./AppIconChip";
import AppIcon from "./AppIcon";
import { cn } from "./cn";

export interface AppInsightCardProps {
  icon: IconName;
  accent?: AccentToken;
  title: string;
  description: string;
  href?: string;
  cta?: string;
  className?: string;
}

export default function AppInsightCard({
  icon, accent = "primary", title, description, href, cta, className,
}: AppInsightCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: duration.card, ease: easing.out }}
      className={cn(
        "flex gap-3 rounded-card border border-border bg-surface p-4 shadow-card",
        className,
      )}
    >
      <AppIconChip icon={icon} accent={accent} />
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold text-text">{title}</p>
        <p className="mt-1 text-caption text-text-secondary">{description}</p>
        {href && cta && (
          <Link
            href={href}
            className="mt-3 inline-flex min-h-11 items-center gap-1 text-caption font-semibold text-primary"
          >
            {cta}
            <AppIcon name="chevronRight" size="sm" />
          </Link>
        )}
      </div>
    </motion.div>
  );
}
