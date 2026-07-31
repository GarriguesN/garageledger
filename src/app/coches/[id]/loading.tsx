// Silueta del resumen del vehículo mientras llega el Server Component.
//
// Reproduce la forma real de la pantalla (foto 16:9, anillo, tarjeta de
// próximo mantenimiento, rejilla de accesos rápidos) para que al llegar los
// datos nada salte de sitio.

import { AppSkeleton } from "@/components/ui";
import { AppScreenFrame, AppScreenMain } from "@/components/ui/AppLayout";

export default function Loading() {
  return (
    <AppScreenFrame>
      <div className="safe-top flex min-h-14 items-center justify-center px-2">
        <AppSkeleton width="40%" height={20} rounded="pill" />
      </div>

      <AppScreenMain hasBottomNav className="space-y-6 pt-2">
        <div role="status" aria-label="Cargando vehículo" className="space-y-6">
          <div>
            <AppSkeleton height={200} rounded="image" />
            <div className="-mt-12 flex flex-col items-center gap-2">
              <AppSkeleton width="112px" height={112} rounded="pill" />
              <AppSkeleton width="40%" height={18} />
            </div>
          </div>

          <AppSkeleton height={112} rounded="card" />

          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <AppSkeleton key={i} height={80} rounded="chip" />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <AppSkeleton height={96} rounded="card" />
            <AppSkeleton height={96} rounded="card" />
          </div>
        </div>
      </AppScreenMain>
    </AppScreenFrame>
  );
}
