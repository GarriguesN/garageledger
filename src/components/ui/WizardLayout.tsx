"use client";

// Armazón compartido por todos los wizards (mockup 1–17).
//
//   ┌─────────────────────────────────────────┐
//   │ ←  Añadir vehículo                  X    │  ← header sticky
//   │ ●━━━━━━●━━━━━━━━●━━━━━━━━━━○  1/4         │  ← progress
//   │                                         │
//   │  Marca y modelo                ← título  │
//   │  Selecciona la marca…        ← subtít.  │
//   │                                         │
//   │   [ grandes inputs ]                    │
//   │                                         │
//   │                                         │
//   │ ─────────────────────────────────────────│
//   │   [ Cancelar ]   [ Siguiente ]          │  ← footer sticky
//   └─────────────────────────────────────────┘
//
// El layout no sabe nada del dominio. El estado (paso actual, validación,
// datos), el título/subtítulo del paso y el contenido se inyectan. El
// Wizard (componente controlador) se apoya en este layout para todo lo
// relativo al chrome.

import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowLeft } from "@/design/tokens/icons";
import { colors, duration, easing, iconSize, strokeWidth } from "@/design/tokens";
import AppProgressDots from "./AppProgressDots";
import { cn } from "./cn";

export interface WizardLayoutProps {
  /** Título fijo (línea de la cabecera). */
  title: string;
  /** Paso actual (1-indexado). */
  currentStep: number;
  /** Número total de pasos. */
  totalSteps: number;
  /** Muestra la flecha de "atrás" en la cabecera. False en el primer paso. */
  onBack?: () => void;
  /** Muestra el aspa de cerrar. */
  onClose: () => void;
  /** Contenido del paso (children). */
  children: React.ReactNode;
  /** Footer sticky (botones del paso). */
  footer: React.ReactNode;
  className?: string;
}

export default function WizardLayout({
  title,
  currentStep,
  totalSteps,
  onBack,
  onClose,
  children,
  footer,
  className,
}: WizardLayoutProps) {
  // El "step key" anima el cambio de contenido: sin él, AnimatePresence
  // no detecta el cambio entre pasos.
  const stepKey = `step-${currentStep}`;
  return (
    <div
      className={cn(
        "safe-x flex h-dvh flex-col bg-background text-text",
        className,
      )}
    >
      <header className="safe-top shrink-0 border-b border-border bg-background">
        <div className="flex min-h-14 items-center gap-1 px-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Atrás"
              className="inline-flex size-11 items-center justify-center text-text"
            >
              <ArrowLeft size={iconSize.lg} strokeWidth={strokeWidth.default} />
            </button>
          ) : (
            <span className="w-2" />
          )}
          <h1 className="min-w-0 flex-1 truncate text-center text-title font-bold text-text">
            {title}
          </h1>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex size-11 items-center justify-center text-text"
          >
            <X size={iconSize.lg} strokeWidth={strokeWidth.default} />
          </button>
        </div>
        <div className="px-4 pb-3 pt-1">
          <AppProgressDots current={currentStep} total={totalSteps} />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={stepKey}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: duration.page, ease: easing.out }}
              className="space-y-4"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer
        className="safe-bottom shrink-0 border-t border-border bg-background"
        style={{ boxShadow: `0 -4px 12px ${colors.background}66` }}
      >
        <div className="mx-auto flex w-full max-w-2xl gap-3 px-4 py-3">
          {footer}
        </div>
      </footer>
    </div>
  );
}
