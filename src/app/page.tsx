import Link from "next/link";
import { Car, Wrench, Euro, Calendar, AlertTriangle } from "lucide-react";
import VehicleCard from "@/components/VehicleCard";
import { getCarDashboardData, getDb } from "@/lib/db";

export default function DashboardPage() {
  const cars = getCarDashboardData();
  const db = getDb();

  // Total monthly spend across all cars
  const ym = new Date().toISOString().slice(0, 7);
  const totalMonth = db.prepare("SELECT COALESCE(SUM(importe),0) as t FROM expenses WHERE strftime('%Y-%m', date)=?").get(ym) as any;

  // Pending maintenance count
  const pendingMaint = db.prepare("SELECT COUNT(*) as c FROM maintenance_tasks mt JOIN cars c ON c.id=mt.car_id WHERE mt.completed=0 AND mt.next_km IS NOT NULL AND mt.next_km <= c.km_actuales").get() as any;

  // Alerts count (cars with estado != "Al dia")
  const alertsCount = cars.filter(c => c.estado !== "Al dia").length;

  // Upcoming maintenance (next 3 across all cars)
  const upcomingTasks = db.prepare(`
    SELECT mt.*, c.marca, c.modelo, c.km_actuales FROM maintenance_tasks mt
    JOIN cars c ON c.id = mt.car_id
    WHERE mt.completed=0 AND mt.next_km IS NOT NULL
    ORDER BY (mt.next_km - c.km_actuales) ASC LIMIT 4
  `).all() as any[];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Taller</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          {cars.length} {cars.length === 1 ? "vehículo" : "vehículos"} registrados
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Euro size={14} className="text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">Gasto este mes</span>
          </div>
          <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>
            {totalMonth.t.toLocaleString("es-ES", { minimumFractionDigits: 2 })}€
          </span>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Car size={14} className="text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">Vehículos</span>
          </div>
          <span className="text-lg font-bold">{cars.length}</span>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Wrench size={14} className={`${pendingMaint.c > 0 ? "text-red-500" : "text-[var(--text-muted)]"}`} />
            <span className="text-xs text-[var(--text-muted)]">Taller pendiente</span>
          </div>
          <span className={`text-lg font-bold ${pendingMaint.c > 0 ? "text-red-500" : ""}`}>
            {pendingMaint.c}
          </span>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className={`${alertsCount > 0 ? "text-amber-500" : "text-[var(--text-muted)]"}`} />
            <span className="text-xs text-[var(--text-muted)]">Alertas</span>
          </div>
          <span className={`text-lg font-bold ${alertsCount > 0 ? "text-amber-500" : ""}`}>
            {alertsCount}
          </span>
        </div>
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
            <Calendar size={16} /> Añadir vehículo
          </Link>
        </div>
      ) : (
        <>
          {/* Vehicle cards */}
          <div>
            <h2 className="text-base font-bold mb-3">Mis Vehículos</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {cars.map((car) => (
                <VehicleCard
                  key={car.id}
                  id={String(car.id)}
                  marca={car.marca}
                  modelo={car.modelo}
                  generacion={car.generacion}
                  ano={car.ano ?? 0}
                  motor={car.motor}
                  kmActuales={car.km_actuales}
                  estado={car.estado}
                  gastoMensual={car.gastoMensual}
                />
              ))}
            </div>
          </div>

          {/* Upcoming maintenance */}
          {upcomingTasks.length > 0 && (
            <div>
              <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                <Wrench size={16} style={{ color: "var(--accent)" }} /> Próximos mantenimientos
              </h2>
              <div className="space-y-2">
                {upcomingTasks.map((t: any) => {
                  const remaining = t.next_km - t.km_actuales;
                  const urgent = remaining <= 0;
                  const near = remaining > 0 && remaining < (t.interval_km || 15000) * 0.15;
                  return (
                    <Link key={t.id} href={`/coches/${t.car_id}`}
                      className={`card flex items-center gap-3 py-2 px-3 no-underline text-[var(--text-primary)] ${
                        urgent ? 'border-red-300 bg-red-50/50' : near ? 'border-amber-200 bg-amber-50/50' : ''
                      }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        urgent ? 'bg-red-100' : near ? 'bg-amber-100' : 'bg-[var(--bg-secondary)]'
                      }`}>
                        <Wrench size={16} className={urgent ? 'text-red-500' : near ? 'text-amber-500' : 'text-[var(--text-muted)]'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{t.part_name}</div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          {t.marca} {t.modelo}
                          {urgent ? ` · ${Math.abs(remaining).toLocaleString("es-ES")} km excedidos` : ` · en ${remaining.toLocaleString("es-ES")} km`}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold ${urgent ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
                        {t.next_km?.toLocaleString("es-ES")} km
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
