'use client';

import { useEffect, useState } from 'react';

// Store ligero: el TopBar (en el RootLayout) escucha cambios de matrícula
// emitidos por las páginas de coche. Sin contexto, sin providers: las
// páginas que conozcan la matrícula hacen publishMatricula() y el TopBar
// se actualiza. Esto evita arrastrar un Provider por toda la app y permite
// que las páginas client-only (como /coches/[id]/editar) actualicen también.

const EVT = "garageledger:topbar-matricula";

export function publishMatricula(value: string | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT, { detail: value ?? null }));
}

export function useMatriculaFromEvents() {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<string | null>;
      setValue(ce.detail ?? null);
    };
    window.addEventListener(EVT, handler);
    return () => window.removeEventListener(EVT, handler);
  }, []);
  return value;
}
