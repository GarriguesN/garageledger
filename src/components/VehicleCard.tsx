import Link from 'next/link';
import { Car, Gauge, Euro, Circle } from 'lucide-react';

interface VehicleCardProps {
  id: string;
  marca: string;
  modelo: string;
  generacion?: string;
  ano: number;
  motor: string;
  kmActuales: number;
  estado: string;
  gastoMensual: number;
}

// Estado colors — semáforo nglab + severity-aware.
// Crítico (rojo) gana sobre advertencia (ámbar), éxito solo si todo está bien.
const statusColor = (estado: string) => {
  const e = estado.toLowerCase();
  if (e.includes('caducad') || e.includes('taller necesario')) return 'var(--accent)'; // critical = Tomato Jam
  if (e.includes('revisar')) return '#f59e0b';                                          // warning = amber
  return 'var(--success)';                                                             // ok = Shamrock
};

// Sólo pintar el gasto en accent cuando el coche NO está "Al día".
const gastoInAccent = (estado: string) => {
  return !estado.toLowerCase().includes('al día') && !estado.toLowerCase().includes('al dia');
};

export default function VehicleCard({
  id, marca, modelo, generacion, ano, motor, kmActuales, estado, gastoMensual
}: VehicleCardProps) {
  const color = statusColor(estado);
  const subtitle = [generacion, ano, motor].filter(Boolean).join(' · ');

  return (
    <Link
      href={`/coches/${id}`}
      className="card block no-underline text-[var(--text-primary)] hover:ring-2 hover:ring-[var(--accent)] transition-all duration-200 group"
    >
      {/* Header row: icono + título | badge estado */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center group-hover:bg-[var(--accent)] group-hover:text-white transition-colors flex-shrink-0">
            <Car size={24} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight truncate">
              {marca} {modelo}
            </h2>
            {subtitle && (
              <p className="text-sm text-[var(--text-secondary)] truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Status badge — esquina superior derecha */}
        <span
          className="badge text-xs font-semibold flex-shrink-0"
          style={{
            background: `${color}18`,
            color: color,
            border: `1px solid ${color}40`,
          }}
        >
          <Circle size={8} fill={color} />
          {estado}
        </span>
      </div>

      {/* Separator */}
      <div className="my-4 border-t border-[var(--border-color)]" />

      {/* Stats row — icon left + label/value stack */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2.5">
          <Gauge size={20} className="text-[var(--text-muted)] flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-muted)] leading-tight">Kilómetros</p>
            <p className="text-base font-bold leading-tight">
              {kmActuales.toLocaleString('es-ES')} km
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Euro size={20} className="text-[var(--text-muted)] flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-muted)] leading-tight">Gasto mensual</p>
            <p
              className="text-base font-bold leading-tight"
              style={{ color: gastoInAccent(estado) ? 'var(--accent)' : 'var(--text-primary)' }}
            >
              {gastoMensual.toFixed(2)}€
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
