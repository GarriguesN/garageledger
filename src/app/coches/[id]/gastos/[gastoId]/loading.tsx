// Silueta del detalle de un gasto: cabecera con importe, bloque de detalles
// y los dos botones de acción.

import { AppSkeleton } from "@/components/ui";
import { AppScreenMain } from "@/components/ui/AppLayout";

export default function Loading() {
  return (
    <>
      <div className="safe-top flex min-h-14 items-center justify-center px-4">
        <AppSkeleton width="25%" height={20} rounded="pill" />
      </div>

      <AppScreenMain hasBottomNav className="space-y-4 pt-2">
        <div role="status" aria-label="Cargando gasto" className="space-y-4">
          <AppSkeleton height={148} rounded="card" />
          <AppSkeleton height={180} rounded="card" />
          <div className="flex gap-3">
            <AppSkeleton height={48} rounded="chip" />
            <AppSkeleton height={48} rounded="chip" />
          </div>
        </div>
      </AppScreenMain>
    </>
  );
}
