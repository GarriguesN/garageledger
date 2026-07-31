'use client';

import { useEffect, useState } from 'react';

// Pub-sub para sincronizar la pestaña activa del detalle de coche (Resumen /
// Documentos) entre NavBar (botones del navbar contextual, en el RootLayout)
// y CarDetailClient (que decide qué contenido mostrar). Mismo patrón que
// TopBarContext.tsx: sin Provider, CustomEvent + hook — evita arrastrar un
// Context de React por todo el árbol para un valor que solo necesitan estos
// dos componentes hermanos.
//
// Dos canales:
//   - EVT_VIEW:     CarDetailClient → NavBar. "Esta es la pestaña que se
//                   está mostrando ahora mismo" (para pintar el icono activo).
//   - EVT_SET_VIEW: NavBar → CarDetailClient. "El usuario pulsó este botón,
//                   cambia a esta pestaña" (comando).

export type CarView = "resumen" | "documentos";

const EVT_VIEW = "garageledger:car-active-view";
const EVT_SET_VIEW = "garageledger:car-set-view";

export function publishCarView(view: CarView | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT_VIEW, { detail: view }));
}

/** Usado por NavBar para saber qué botón pintar en rojo. Por defecto
 *  "resumen": es la pestaña inicial de CarDetailClient antes de su primer
 *  publish, y el valor al que se vuelve cuando se sale del detalle de coche. */
export function useCarViewFromEvents(): CarView {
  const [value, setValue] = useState<CarView>("resumen");
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<CarView | null>;
      setValue(ce.detail ?? "resumen");
    };
    window.addEventListener(EVT_VIEW, handler);
    return () => window.removeEventListener(EVT_VIEW, handler);
  }, []);
  return value;
}

/** El navbar contextual dispara esto al pulsar Resumen o Documentos. */
export function requestCarView(view: CarView) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT_SET_VIEW, { detail: view }));
}

/** CarDetailClient escucha los comandos del navbar y actualiza su estado. */
export function useCarViewRequests(onRequest: (view: CarView) => void) {
  useEffect(() => {
    const handler = (e: Event) => onRequest((e as CustomEvent<CarView>).detail);
    window.addEventListener(EVT_SET_VIEW, handler);
    return () => window.removeEventListener(EVT_SET_VIEW, handler);
  }, [onRequest]);
}
