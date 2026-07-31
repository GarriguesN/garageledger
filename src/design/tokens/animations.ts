// Duraciones, curvas y variantes de framer-motion.
//
// Regla de rendimiento: solo se animan `transform` y `opacity`. Animar
// width/height/top/left provoca layout en cada frame y tira los 60 FPS.

export const duration = {
  /** Feedback de pulsación. */
  press: 0.15,
  /** Transición de tarjeta / hover / elevación. */
  card: 0.15,
  /** Fundido de página o de modal. */
  page: 0.2,
  /** Entrada de gráficos. */
  chart: 0.4,
  /** Barrido del anillo de progreso. */
  ring: 1.2,
} as const;

/** Milisegundos — para chart.js y CSS, que no usan segundos. */
export const durationMs = {
  press: 150,
  card: 150,
  page: 200,
  chart: 400,
  ring: 1200,
} as const;

export const easing = {
  /** Salida estándar: rápido al empezar, suave al parar. */
  out: [0.16, 1, 0.3, 1] as const,
  /** Entrada y salida simétrica. */
  inOut: [0.65, 0, 0.35, 1] as const,
} as const;

export const easingCss = {
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;

/** Muelle del FAB al desplegar su menú. */
export const fabSpring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 28,
  mass: 0.8,
};

// ── Variantes reutilizables de framer-motion ──────────────────────

/** Botones: escala 0.97 durante 150 ms. */
export const pressable = {
  whileTap: { scale: 0.97 },
  transition: { duration: duration.press, ease: easing.out },
};

/** Tarjetas: la pulsación eleva ligeramente en lugar de encoger. */
export const pressableCard = {
  whileTap: { scale: 0.985 },
  transition: { duration: duration.card, ease: easing.out },
};

/** Aparición de una lista, escalonando sus hijos. */
export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: duration.page, ease: easing.out } },
};

/** Sheet modal a pantalla completa (entra desde abajo). */
export const modalSheet = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: duration.page, ease: easing.out } },
  exit: { opacity: 0, y: 24, transition: { duration: duration.press, ease: easing.out } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: duration.page } },
  exit: { opacity: 0, transition: { duration: duration.press } },
};
