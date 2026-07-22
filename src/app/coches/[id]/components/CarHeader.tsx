// Header del detalle del coche: back arrow (Link, no router.back),
// icono + título/subtítulo (con modo edición inline), y acciones
// esquina superior derecha (Editar / Exportar CSV).

import Link from "next/link";
import {
  ArrowLeft, Car as CarIcon, Edit, Download, Save, X,
} from "lucide-react";
import type { Car, CarEditFormState } from "../lib/types";

interface CarHeaderProps {
  car: Car;
  showEditCar: boolean;
  carForm: CarEditFormState;
  onChangeCarForm: (next: CarEditFormState) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function CarHeader({
  car,
  showEditCar,
  carForm,
  onChangeCarForm,
  onSave,
  onCancel,
}: CarHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      {/* Back arrow — solo desktop (móvil usa bottom navbar) */}
      <Link
        href="/"
        className="max-sm:hidden sm:flex items-center justify-center p-2 mt-1 rounded-md hover:bg-[var(--bg-secondary)] transition-colors"
      >
        <ArrowLeft size={20} />
      </Link>
      <div className="w-14 h-14 sm:w-12 sm:h-12 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
        <CarIcon size={22} style={{ color: "var(--accent)" }} />
      </div>
      <div className="flex-1 min-w-0 pt-1">
        {showEditCar ? (
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <input
                className="input flex-1 min-w-[100px] text-sm"
                value={carForm.marca}
                onChange={(e) => onChangeCarForm({ ...carForm, marca: e.target.value })}
                placeholder="Marca"
              />
              <input
                className="input flex-1 min-w-[100px] text-sm"
                value={carForm.modelo}
                onChange={(e) => onChangeCarForm({ ...carForm, modelo: e.target.value })}
                placeholder="Modelo"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <input
                className="input flex-1 min-w-[80px] text-sm"
                value={carForm.generacion}
                onChange={(e) => onChangeCarForm({ ...carForm, generacion: e.target.value })}
                placeholder="Gen"
              />
              <input
                className="input flex-1 min-w-[80px] text-sm"
                value={carForm.motor}
                onChange={(e) => onChangeCarForm({ ...carForm, motor: e.target.value })}
                placeholder="Motor"
              />
              <input
                className="input w-16 text-sm"
                type="number"
                value={carForm.ano}
                onChange={(e) => onChangeCarForm({ ...carForm, ano: e.target.value })}
                placeholder="Año"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <input
                className="input w-24 text-sm"
                type="number"
                value={carForm.km_actuales}
                onChange={(e) =>
                  onChangeCarForm({ ...carForm, km_actuales: parseInt(e.target.value) || 0 })
                }
                placeholder="Km"
              />
              <input
                className="input w-24 text-sm"
                value={carForm.puertas}
                onChange={(e) => onChangeCarForm({ ...carForm, puertas: e.target.value })}
                placeholder="Ptas"
              />
              <input
                className="input flex-1 text-sm"
                value={carForm.estado}
                onChange={(e) => onChangeCarForm({ ...carForm, estado: e.target.value })}
                placeholder="Estado"
              />
            </div>
            <div className="flex gap-2">
              <label className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                Última ITV:
                <input
                  className="input text-xs w-32"
                  type="date"
                  value={carForm.fecha_ultima_itv}
                  onChange={(e) => onChangeCarForm({ ...carForm, fecha_ultima_itv: e.target.value })}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary btn-sm text-xs" onClick={onSave}>
                <Save size={14} /> Guardar
              </button>
              <button className="btn btn-secondary btn-sm text-xs" onClick={onCancel}>
                <X size={14} /> Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold">
              {car.marca} {car.modelo}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {car.generacion} · {car.ano} · {car.motor}
            </p>
          </>
        )}
      </div>
      {/* Actions — esquina superior derecha */}
      <div className="flex items-start gap-2 pt-1 flex-shrink-0">
        <a
          href={`/coches/${car.id}/editar`}
          className="btn btn-secondary btn-sm text-xs gap-1.5"
          title="Editar vehículo"
        >
          <Edit size={14} /> <span className="hidden sm:inline">Editar</span>
        </a>
        <a
          href={`/api/car/${car.id}/export`}
          className="btn btn-secondary text-xs flex-shrink-0 hidden sm:inline-flex gap-1.5"
          download
        >
          <Download size={14} /> Exportar CSV
        </a>
      </div>
    </div>
  );
}
