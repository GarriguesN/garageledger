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

const statusColor = (estado: string) => {
  if (estado.toLowerCase().includes('mantenimiento')) return 'var(--success)';
  if (estado.toLowerCase().includes('revisar')) return '#f59e0b';
  return 'var(--accent)';
};

export default function VehicleCard({
  id, marca, modelo, generacion, ano, motor, kmActuales, estado, gastoMensual
}: VehicleCardProps) {
  return (
    <Link
      href={`/coches/${id}`}
      className="card block no-underline text-[var(--text-primary)] hover:ring-2 hover:ring-[var(--accent)] transition-all duration-200 group"
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center group-hover:bg-[var(--accent)] group-hover:text-white transition-colors">
            <Car size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">
              {marca} {modelo}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {generacion && `${generacion} · `}{ano} · {motor}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <span
          className="badge text-xs font-semibold"
          style={{
            background: `${statusColor(estado)}18`,
            color: statusColor(estado),
            border: `1px solid ${statusColor(estado)}40`,
          }}
        >
          <Circle size={8} fill={statusColor(estado)} />
          {estado}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Gauge size={16} className="text-[var(--text-muted)]" />
          <div>
            <p className="text-xs text-[var(--text-muted)]">Kilómetros</p>
            <p className="text-sm font-semibold">{kmActuales.toLocaleString('es-ES')} km</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Euro size={16} className="text-[var(--text-muted)]" />
          <div>
            <p className="text-xs text-[var(--text-muted)]">Gasto mensual</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
              {gastoMensual.toFixed(2)}€
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
