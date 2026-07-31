"use client";

// Botón. Tres variantes y una sola interacción: escala 0.97 en 150 ms.
// La altura mínima (44px) cumple el área táctil accesible en todas ellas.

import { motion } from "framer-motion";
import Link from "next/link";
import { duration, easing, iconSize, strokeWidth } from "@/design/tokens";
import { resolveIcon, type IconName } from "@/design/tokens/icons";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "bg-surface-elevated text-text border border-border hover:border-text-muted",
  ghost: "bg-transparent text-text-secondary hover:text-text",
  danger: "bg-danger text-white",
};

const SIZES: Record<Size, string> = {
  md: "min-h-11 px-4 text-body",
  lg: "min-h-12 px-6 text-body w-full",
};

export interface AppButtonProps {
  children?: React.ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  /** Coloca el icono después del texto. */
  iconAfter?: boolean;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  ariaLabel?: string;
}

export default function AppButton({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconAfter = false,
  onClick,
  href,
  type = "button",
  disabled = false,
  loading = false,
  className,
  ariaLabel,
}: AppButtonProps) {
  const Icon = icon ? resolveIcon(icon) : null;

  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-button font-semibold",
    "transition-colors select-none",
    VARIANTS[variant],
    SIZES[size],
    (disabled || loading) && "opacity-50 pointer-events-none",
    className,
  );

  const content = (
    <>
      {Icon && !iconAfter && <Icon size={iconSize.md} strokeWidth={strokeWidth.default} />}
      {children}
      {Icon && iconAfter && <Icon size={iconSize.md} strokeWidth={strokeWidth.default} />}
    </>
  );

  const press = {
    whileTap: disabled || loading ? undefined : { scale: 0.97 },
    transition: { duration: duration.press, ease: easing.out },
  };

  if (href && !disabled) {
    return (
      <motion.span {...press} className="inline-flex">
        <Link href={href} aria-label={ariaLabel} className={classes}>
          {content}
        </Link>
      </motion.span>
    );
  }

  return (
    <motion.button
      {...press}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      className={classes}
    >
      {content}
    </motion.button>
  );
}
