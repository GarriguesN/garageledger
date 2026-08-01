"use client";

// Distribución por categoría en barras horizontales, ordenada de mayor a
// menor.
//
// Es el mismo dato que el donut, contado de otra forma: el donut responde
// "cómo se reparte" y esta lista "quién manda y por cuánto". Con más de
// cinco categorías el donut se vuelve ilegible y esta no.
//
// La barra se anima con scaleX (transform, no layout) al entrar en pantalla,
// y con "reducir movimiento" aparece ya en su tamaño.

import { motion, useReducedMotion } from "framer-motion";
import { accents, duration, easing, type AccentToken } from "@/design/tokens";
import { cn } from "./cn";

export interface BarListItem {
  id: string;
  label: string;
  /** Valor ya formateado ("87 €"). */
  value: string;
  /** 0–1 respecto al mayor de la lista. */
  share: number;
  accent: AccentToken;
}

export interface AppBarListProps {
  items: BarListItem[];
  className?: string;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));

export default function AppBarList({ items, className }: AppBarListProps) {
  const reduce = useReducedMotion();

  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item, i) => {
        const pct = clamp01(item.share);
        return (
          <li key={item.id}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-caption text-text-secondary">{item.label}</span>
              <span className="tabular shrink-0 text-caption font-semibold text-text">
                {item.value}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-pill bg-surface-elevated">
              <motion.div
                initial={{ scaleX: reduce ? pct : 0 }}
                whileInView={{ scaleX: pct }}
                viewport={{ once: true }}
                transition={{
                  duration: reduce ? 0 : duration.ring,
                  ease: easing.out,
                  // Escalonado: las barras entran de arriba abajo, que es como
                  // se leen.
                  delay: reduce ? 0 : i * 0.05,
                }}
                style={{ backgroundColor: accents[item.accent], transformOrigin: "left" }}
                className="h-full w-full rounded-pill"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
