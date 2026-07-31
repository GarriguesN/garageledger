"use client";

// Captura errores del segmento /coches/[id], que cubren dos escenarios:
//
//   1. La carga inicial del Server Component (SQLite bloqueada, permisos de
//      `data/`, una query que lanza). Estos errores traen `digest`, una clave
//      opaca que permite correlacionarlos con los registros del servidor.
//   2. Errores lanzados desde el cliente al renderizar o al mutar.
//
// En ninguno de los dos se enseña `error.message` en crudo: puede contener
// rutas internas o fragmentos de la consulta. Se muestra un texto estable y,
// si existe, el digest para poder buscar el detalle en los registros.

import { AppButton, AppEmptyState, AppHeader } from "@/components/ui";
import { AppScreenFrame, AppScreenMain } from "@/components/ui/AppLayout";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isServerLoad = error.digest !== undefined;

  return (
    <AppScreenFrame>
      <AppHeader title="Vehículo" align="center" back="/" />
      <AppScreenMain>
        <AppEmptyState
          icon="warning"
          accent="danger"
          title="Algo ha salido mal"
          description={
            isServerLoad
              ? "No se ha podido cargar este vehículo. Comprueba que la base de datos esté accesible y vuelve a intentarlo."
              : "Ha ocurrido un error inesperado al mostrar este vehículo. Puedes reintentarlo; si sigue pasando, revisa los registros del servidor."
          }
        />
        {error.digest && (
          <p className="text-center text-caption text-text-muted">ref: {error.digest}</p>
        )}
        <div className="mt-6 flex justify-center">
          <AppButton icon="rotate" onClick={() => reset()}>
            Intentar de nuevo
          </AppButton>
        </div>
      </AppScreenMain>
    </AppScreenFrame>
  );
}
