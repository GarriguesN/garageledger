// Server Component para "/" (Garaje).
//
// Defensa-en-profundidad (mismo patrón que src/app/coches/[id]/page.tsx del
// Ticket 1.3):
//   - Lee la cookie de sesión server-side ANTES de tocar getCarDashboardData().
//   - Sin sesión válida: NO llama a getCarDashboardData() (cars queda []).
//     El HTML resultante NO contiene marca/modelo/matrícula/VIN/gastoMensual.
//   - La PinGate cliente (envuelta en src/app/layout.tsx) está SIEMPRE montada
//     en el layout raíz y se encarga de mostrar el candado (si hay PIN) o el
//     wizard "Establecer PIN" (si no hay PIN, "primer uso"). Esta doble
//     barrera (SC con cars=[] + layout con PinGate) garantiza que un curl sin
//     cookie NUNCA vea datos sensibles, ni siquiera si alguien borrara el SC.
//
// Esto cierra el agujero del Ticket 1.3-fix: antes, "/" NO estaba en el
// matcher del middleware Y GaragePage renderizaba getCarDashboardData() sin
// comprobar sesión, así que un curl sin cookie recibía el HTML completo.

import Link from "next/link";
import { cookies } from "next/headers";
import { Home, Car, Plus } from "lucide-react";
import VehicleCard from "@/components/VehicleCard";
import { getCarDashboardData } from "@/lib/db";
import { readSessionFromValue } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function GaragePage() {
  // ── 1) Auth: leer y validar la cookie ANTES de tocar la DB de coches.
  const cookieStore = await cookies();
  const session = readSessionFromValue(cookieStore.get("gl_sess")?.value);

  // ── 2) Carga inicial en el servidor (solo si hay sesión válida).
  // Si no hay sesión devolvemos lista vacía: NO se filtra NINGÚN dato de
  // coche al HTML. La PinGate cliente (montada en src/app/layout.tsx) se
  // encarga de mostrar el unlock o el wizard de "Establecer PIN".
  const cars = session ? getCarDashboardData() : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(195, 66, 63, 0.10)", color: "var(--accent)" }}
            aria-hidden
          >
            <Home size={22} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight leading-tight">Garaje</h1>
            <p className="text-sm text-[var(--text-secondary)] leading-tight">
              {cars.length} {cars.length === 1 ? "vehículo" : "vehículos"}
            </p>
          </div>
        </div>
        <Link
          href="/coches/nuevo"
          className="btn btn-primary !py-2 !px-3.5 text-sm flex items-center gap-1.5 shadow-sm flex-shrink-0"
          style={{ background: "var(--accent)" }}
        >
          <Plus size={16} />
          <span>Añadir vehículo</span>
        </Link>
      </div>

      {/* Empty state */}
      {cars.length === 0 ? (
        <div className="card text-center py-12">
          <Car size={48} className="mx-auto mb-3 text-[var(--text-muted)]" />
          <h2 className="text-lg font-bold mb-1">No hay vehículos</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Añade tu primer vehículo para empezar a controlar tus gastos
          </p>
          <Link href="/coches/nuevo" className="btn btn-primary">
            <Plus size={16} /> Añadir vehículo
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cars.map((car) => (
            <VehicleCard
              key={car.id}
              id={String(car.id)}
              marca={car.marca}
              modelo={car.modelo}
              generacion={car.generacion}
              ano={car.ano ?? 0}
              motor={car.motor}
              matricula={car.matricula}
              bastidor={car.bastidor}
              combustible={car.combustible}
              kmActuales={car.km_actuales}
              estado={car.estado}
              gastoMensual={car.gastoMensual}
              fotoAttachmentId={car.foto_attachment_id}
              archivado={car.archivado === 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
