// Bloques de carga. El spec prohíbe los spinners: cada pantalla enseña la
// silueta de lo que va a aparecer, así el layout no salta al llegar los datos.

import { cn } from "./cn";

export interface AppSkeletonProps {
  className?: string;
  /** Ancho relativo para simular texto de longitud irregular. */
  width?: string;
  height?: number | string;
  rounded?: "chip" | "card" | "pill" | "image";
}

const ROUNDED = {
  chip: "rounded-chip",
  card: "rounded-card",
  pill: "rounded-pill",
  image: "rounded-image",
} as const;

export default function AppSkeleton({
  className,
  width,
  height = 16,
  rounded = "chip",
}: AppSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton", ROUNDED[rounded], className)}
      style={{ width, height }}
    />
  );
}

/** Silueta de una fila con chip de icono: mantenimientos, documentos,
 *  gastos y timeline comparten esta forma. */
export function AppRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Cargando">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-card border border-border bg-surface p-4"
        >
          <AppSkeleton width="40px" height={40} />
          <div className="flex-1 space-y-2">
            <AppSkeleton width="55%" height={14} />
            <AppSkeleton width="35%" height={12} />
          </div>
          <AppSkeleton width="48px" height={14} />
        </div>
      ))}
    </div>
  );
}

/** Silueta de la tarjeta de vehículo del garaje. */
export function AppVehicleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface" role="status" aria-label="Cargando">
      <AppSkeleton height="160px" rounded="card" className="rounded-b-none" />
      <div className="space-y-3 p-4">
        <AppSkeleton width="50%" height={18} />
        <AppSkeleton width="70%" height={12} />
        <div className="flex gap-2">
          <AppSkeleton width="33%" height={44} />
          <AppSkeleton width="33%" height={44} />
          <AppSkeleton width="33%" height={44} />
        </div>
      </div>
    </div>
  );
}
