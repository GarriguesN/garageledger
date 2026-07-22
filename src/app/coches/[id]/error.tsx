"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

// Captura errores del segmento /coches/[id].
//
// Desde TICKET 1.3 la pantalla se carga en un Server Component que ejecuta
// las queries iniciales a `getCarMetrics`, `getTimeline`, `getCarNotes`,
// `getAttachments` y `getMaintenanceTasks`. Por tanto este error.tsx cubre
// ahora **dos** escenarios:
//
//   1. Errores de la carga inicial del SC (p.ej. SQLite bloqueada, falta de
//      permisos en `data/`, query que lanza). El SC lanza, Next renderiza
//      este error y el usuario puede reintentar. Estos errores llevan `digest`
//      (clave opaca para correlación de logs server-side).
//   2. Errores lanzados desde el cliente (mutaciones que propagan, render
//      del `CarDetailClient`). Ya estaba cubierto desde antes de 1.3.
//
// En ambos casos mostramos el `digest` si está (clave opaca para correlación
// de logs server-side) y un mensaje corto, nunca la pila ni datos sensibles.
// El mensaje genérico del caso 2 no revela el `error.message` crudo porque
// puede contener detalles de queries o paths internos — preferimos un texto
// estable y soporte humano vía los logs.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isServerLoad = error.digest !== undefined;
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <AlertTriangle size={48} className="text-red-500" />
      <h2 className="text-lg font-bold">Algo salió mal</h2>
      <p className="text-sm text-[var(--text-secondary)] text-center max-w-md">
        {isServerLoad
          ? "No se pudo cargar este vehículo. Comprueba que la base de datos esté accesible y vuelve a intentarlo."
          : "Ha ocurrido un error inesperado al mostrar este vehículo. Puedes reintentar; si persiste, revisa los logs del servidor."}
      </p>
      {error.digest && (
        <p className="text-xs text-[var(--text-muted)] font-mono">
          ref: {error.digest}
        </p>
      )}
      <button className="btn btn-primary" onClick={() => reset()}>
        <RefreshCw size={16} /> Intentar de nuevo
      </button>
    </div>
  );
}
