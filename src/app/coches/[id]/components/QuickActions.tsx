"use client";

// Rejilla de accesos rápidos del resumen (mockup 2): Combustible, Gasto,
// Mantenimiento, Kilometraje, Documento y Más.
//
// Los cuatro primeros abren el asistente de gasto ya en el formulario de su
// categoría —ahorran el paso 1—; Documento lleva a su pestaña y "Más" abre
// el asistente por el principio.

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { duration, easing, iconSize, strokeWidth, accents, type AccentToken } from "@/design/tokens";
import { resolveIcon, type IconName } from "@/design/tokens/icons";
import { useCarShell } from "./CarShell";

interface Action {
  icon: IconName;
  label: string;
  accent: AccentToken;
  /** Categoría con la que abrir el asistente. */
  category?: string;
  href?: string;
  /** Abre el asistente desde la rejilla de tipos. */
  wizard?: boolean;
}

export default function QuickActions({ carId }: { carId: number }) {
  const router = useRouter();
  const { openExpenseWizard } = useCarShell();

  const actions: Action[] = [
    { icon: "fuel", label: "Combustible", accent: "green", category: "carburante" },
    { icon: "euro", label: "Gasto", accent: "primary", category: "reparacion" },
    { icon: "wrench", label: "Mantenimiento", accent: "orange", category: "mantenimiento" },
    { icon: "gauge", label: "Kilometraje", accent: "blue", href: `/coches/${carId}/editar` },
    { icon: "document", label: "Documento", accent: "purple", href: `/coches/${carId}/documentos` },
    { icon: "more", label: "Más", accent: "cyan", wizard: true },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {actions.map((a) => {
        const Icon = resolveIcon(a.icon);
        return (
          <motion.button
            key={a.label}
            type="button"
            whileTap={{ scale: 0.97 }}
            transition={{ duration: duration.press, ease: easing.out }}
            onClick={() => {
              if (a.href) router.push(a.href);
              else openExpenseWizard(a.category);
            }}
            className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-chip border border-border bg-surface p-3"
          >
            <Icon
              size={iconSize.md}
              strokeWidth={strokeWidth.default}
              color={accents[a.accent]}
              aria-hidden="true"
            />
            <span className="text-caption font-medium text-text">{a.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
