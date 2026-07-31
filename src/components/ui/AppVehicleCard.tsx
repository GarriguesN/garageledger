"use client";

// Tarjeta de vehículo del garaje (mockup 1) y su variante compacta para la
// lista de vehículos (mockup 9).
//
// La foto es 16:9 con degradado inferior para que el badge de estado se lea
// sobre cualquier imagen. Mientras carga se muestra el hueco en gris; si el
// coche no tiene foto se pinta un degradado con el icono del coche — el
// mockup nunca enseña un vehículo sin foto, así que este caso es una
// desviación consciente (docs/UI_REBUILD_PLAN.md §7).

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Car } from "@/design/tokens/icons";
import {
  colors, accents, duration, easing, iconSize, strokeWidth, radius, hexToRgba,
  type AccentToken,
} from "@/design/tokens";
import AppBadge from "./AppBadge";
import { cn } from "./cn";

export interface VehicleMetric {
  label: string;
  value: string;
  accent: AccentToken;
}

export interface AppVehicleCardProps {
  href: string;
  name: string;
  /** Distintivo junto al nombre: generación ("Type S FK2", "F30"). */
  trim?: string;
  /** "2009 · 1.8 i-VTEC" */
  subtitle: string;
  mileage: string;
  photoUrl?: string | null;
  status?: { label: string; accent: AccentToken };
  metrics?: VehicleMetric[];
  variant?: "full" | "compact";
  className?: string;
}

function PhotoPlaceholder({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="flex size-full items-center justify-center"
      style={{
        background: `linear-gradient(135deg, ${hexToRgba(colors.primary, 0.18)}, ${colors.surfaceElevated})`,
      }}
    >
      <Car
        size={compact ? iconSize.lg : 40}
        strokeWidth={strokeWidth.default}
        className="text-text-muted"
        aria-hidden="true"
      />
    </div>
  );
}

function Photo({ url, alt, compact }: { url?: string | null; alt: string; compact?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!url || failed) return <PhotoPlaceholder compact={compact} />;

  return (
    <>
      {!loaded && <div className="skeleton absolute inset-0" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          "size-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </>
  );
}

export default function AppVehicleCard({
  href,
  name,
  trim,
  subtitle,
  mileage,
  photoUrl,
  status,
  metrics,
  variant = "full",
  className,
}: AppVehicleCardProps) {
  const press = {
    whileTap: { scale: 0.985 },
    transition: { duration: duration.card, ease: easing.out },
  };

  if (variant === "compact") {
    return (
      <motion.div {...press}>
        <Link
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-card border border-border bg-surface p-3 shadow-card",
            className,
          )}
        >
          <span
            className="relative block h-14 w-20 shrink-0 overflow-hidden"
            style={{ borderRadius: radius.chip }}
          >
            <Photo url={photoUrl} alt={name} compact />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-body font-semibold text-text">{name}</span>
              {status && (
                <AppBadge accent={status.accent} className="ml-auto shrink-0">
                  {status.label}
                </AppBadge>
              )}
            </span>
            <span className="mt-0.5 block truncate text-caption text-text-secondary">{subtitle}</span>
            <span className="tabular mt-0.5 block text-caption text-text-secondary">{mileage}</span>
          </span>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div {...press} className={className}>
      <Link
        href={href}
        className="block overflow-hidden rounded-card border border-border bg-surface shadow-card"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-surface-elevated">
          <Photo url={photoUrl} alt={name} />
          <div className="photo-overlay pointer-events-none absolute inset-0" />
          {status && (
            <span className="absolute right-3 top-3">
              <AppBadge accent={status.accent} dot>
                {status.label}
              </AppBadge>
            </span>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate text-title font-bold text-text">{name}</h3>
            {trim && (
              <span
                className="shrink-0 px-2 py-0.5 text-caption font-semibold text-text-secondary"
                style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.pill }}
              >
                {trim}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="truncate text-caption text-text-secondary">{subtitle}</span>
            <span className="tabular shrink-0 text-caption font-medium text-text-secondary">
              {mileage}
            </span>
          </div>

          {metrics && metrics.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {metrics.map((m) => (
                <div
                  key={m.label}
                  className="min-w-0 rounded-chip border border-border bg-surface-elevated p-2"
                >
                  <div className="truncate text-caption text-text-secondary">{m.label}</div>
                  <div
                    className="tabular truncate text-caption font-bold"
                    style={{ color: accents[m.accent] }}
                  >
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
