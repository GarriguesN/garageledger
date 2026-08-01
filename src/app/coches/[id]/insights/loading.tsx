// Silueta de Insights: cabecera del vehículo, tarjeta de puntuación, rejilla
// de métricas y las gráficas. Mismas alturas que el contenido real.

import { AppSkeleton } from "@/components/ui";
import { AppScreenMain } from "@/components/ui/AppLayout";

export default function Loading() {
  return (
    <>
      <div className="safe-top flex min-h-14 items-center px-4">
        <AppSkeleton width="30%" height={22} rounded="pill" />
      </div>

      <AppScreenMain hasBottomNav className="space-y-6 pt-2">
        <div role="status" aria-label="Cargando insights" className="space-y-6">
          <AppSkeleton height={96} rounded="card" />
          <AppSkeleton height={220} rounded="card" />

          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <AppSkeleton key={i} height={120} rounded="card" />
            ))}
          </div>

          <AppSkeleton height={240} rounded="card" />
          <AppSkeleton height={160} rounded="card" />
        </div>
      </AppScreenMain>
    </>
  );
}
