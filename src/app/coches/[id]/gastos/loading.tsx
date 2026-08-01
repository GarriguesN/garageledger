// Silueta de Gastos mientras llega el Server Component: pestañas, tarjeta
// del mes con su donut, las cifras de contexto y la evolución. Reproduce la
// forma real para que al llegar los datos nada salte de sitio.

import { AppSkeleton } from "@/components/ui";
import { AppScreenMain } from "@/components/ui/AppLayout";

export default function Loading() {
  return (
    <>
      <div className="safe-top flex min-h-14 items-center px-4">
        <AppSkeleton width="30%" height={22} rounded="pill" />
      </div>

      <AppScreenMain hasBottomNav className="pt-2">
        <div role="status" aria-label="Cargando gastos" className="space-y-4">
          <AppSkeleton height={44} rounded="chip" />

          <div className="rounded-card border border-border bg-surface p-4">
            <AppSkeleton width="25%" height={12} />
            <div className="mt-2">
              <AppSkeleton width="45%" height={32} />
            </div>
            <div className="mt-4 flex items-center gap-4">
              <AppSkeleton width="112px" height={112} rounded="pill" />
              <div className="flex-1 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <AppSkeleton key={i} height={12} />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <AppSkeleton height={104} rounded="card" />
            <AppSkeleton height={104} rounded="card" />
          </div>

          <AppSkeleton height={200} rounded="card" />
        </div>
      </AppScreenMain>
    </>
  );
}
