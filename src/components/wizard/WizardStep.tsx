"use client";

// Un paso: título grande, frase de apoyo y contenido. La animación de
// entrada indica la dirección (adelante entra por la derecha, atrás por la
// izquierda) para que el movimiento cuente lo que acaba de pasar.
//
// Solo anima al entrar: el motor remonta el paso al cambiar de id, sin
// esperar a que el anterior salga. Encadenar salida y entrada añadía una
// espera de 200 ms a cada toque de "Siguiente", que es justo lo que más se
// pulsa en un asistente.

import { motion, useReducedMotion } from "framer-motion";
import { duration, easing } from "@/design/tokens";

export interface WizardStepProps {
  title: string;
  subtitle?: string;
  /** 1 = avanzando, -1 = retrocediendo. */
  direction: number;
  children: React.ReactNode;
}

export default function WizardStep({ title, subtitle, direction, children }: WizardStepProps) {
  const reduce = useReducedMotion();
  const offset = reduce ? 0 : 24 * direction;

  return (
    <motion.div
      initial={{ opacity: 0, x: offset }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: duration.page, ease: easing.out }}
    >
      <h3 className="text-heading font-bold text-text">{title}</h3>
      {subtitle && <p className="mt-1 text-body text-text-secondary">{subtitle}</p>}
      <div className="mt-6 space-y-4">{children}</div>
    </motion.div>
  );
}
