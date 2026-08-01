"use client";

// Pestañas con subrayado (mockup 5: Resumen/Historial; mockup 7:
// Próximos/Historial/Programados). El subrayado se desliza entre pestañas con
// layoutId en vez de animar `left`, así el movimiento es puro transform.

import { motion } from "framer-motion";
import { colors, duration, easing } from "@/design/tokens";
import { cn } from "./cn";

export interface AppTab {
  id: string;
  label: string;
}

export interface AppTabsProps {
  tabs: AppTab[];
  active: string;
  onChange: (id: string) => void;
  /** Identificador único si hay más de un grupo de pestañas en la pantalla. */
  layoutGroup?: string;
  className?: string;
}

export default function AppTabs({
  tabs,
  active,
  onChange,
  layoutGroup = "tabs",
  className,
}: AppTabsProps) {
  return (
    <div role="tablist" className={cn("flex border-b border-border", className)}>
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative min-h-11 flex-1 px-2 pb-3 text-body font-semibold transition-colors",
              selected ? "text-primary" : "text-text-secondary hover:text-text",
            )}
          >
            {tab.label}
            {selected && (
              <motion.span
                layoutId={`${layoutGroup}-underline`}
                transition={{ duration: duration.card, ease: easing.out }}
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-pill"
                style={{ backgroundColor: colors.primary }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
