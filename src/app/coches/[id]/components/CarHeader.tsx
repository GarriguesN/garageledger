// Header del detalle del coche — rediseño Ticket 1.5.
//
// Mockup: icono del coche en cuadro redondeado a la izquierda, nombre +
// subtítulo (generación · año · motor), chips de Matrícula y Bastidor con
// icono debajo del subtítulo, botón "..." circular a la derecha que abre
// un dropdown con Editar / Exportar CSV (mismo patrón visual que
// VehicleCard del Ticket 1.1 — dropdown kebab con click-outside / Escape).
//
// Este ticket es SOLO JSX/clases Tailwind. No se tocan props, handlers,
// ni cálculos. La edición inline del coche sigue funcionando exactamente
// igual que antes — solo cambia su presentación visual.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Car as CarIcon, Edit, Download, Save, X,
  CreditCard, Barcode, MoreHorizontal,
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

// Paleta local coherente con el rediseño Ticket 1.5 y con VehicleCard.
const HEADER_ICON_BG = "#f2f2f3";
const HEADER_ICON_FG = "#c3423f"; // var(--accent)
const TEXT_DARK = "#211a1e";
const TEXT_GRAY = "#8a8588";
const KEBAB_COLOR = "#c7c7cc";

export default function CarHeader({
  car,
  showEditCar,
  carForm,
  onChangeCarForm,
  onSave,
  onCancel,
}: CarHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Cierra el dropdown con click fuera o Escape (mismo patrón que VehicleCard).
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener("mousedown", onDocClick);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onDocClick);
        document.removeEventListener("keydown", onKey);
      };
    }
  }, [menuOpen]);

  return (
    <div className="flex items-start gap-3">
      {/* Back arrow — solo desktop (móvil usa bottom navbar). El mockup no lo
          muestra en móvil, lo mantenemos solo en sm+ como antes. */}
      <Link
        href="/"
        className="max-sm:hidden sm:flex items-center justify-center p-2 mt-1 rounded-md hover:bg-[var(--bg-secondary)] transition-colors"
      >
        <ArrowLeft size={20} />
      </Link>

      <Link
        href="/"
        aria-label="Volver al Garaje"
        className="w-14 h-14 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: HEADER_ICON_BG }}
      >
        <CarIcon size={22} style={{ color: HEADER_ICON_FG }} />
      </Link>

      {/* Icono del coche en cuadro redondeado (mockup) */}
      <div className="hidden">
        <CarIcon size={22} style={{ color: HEADER_ICON_FG }} />
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
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
            <div className="flex gap-2 flex-wrap">
              <label className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                Última ITV:
                <input
                  className="input text-xs w-32"
                  type="date"
                  value={carForm.fecha_ultima_itv}
                  onChange={(e) => onChangeCarForm({ ...carForm, fecha_ultima_itv: e.target.value })}
                />
              </label>
              <label className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                Vencimiento seguro:
                <input
                  className="input text-xs w-32"
                  type="date"
                  value={carForm.fecha_vencimiento_seguro}
                  onChange={(e) => onChangeCarForm({ ...carForm, fecha_vencimiento_seguro: e.target.value })}
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
            <h1
              className="text-[20px] sm:text-xl font-bold tracking-tight leading-tight"
              style={{ color: TEXT_DARK }}
            >
              {car.marca} {car.modelo}
            </h1>
            <p
              className="text-[13px] sm:text-sm leading-tight mt-0.5 truncate"
              style={{ color: TEXT_GRAY }}
            >
              {[car.generacion, car.ano, car.motor].filter(Boolean).join(" · ")}
            </p>
      {/* Chips de Matrícula y Bastidor con icono (mockup) */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {car.matricula && (
                <Chip icon={<CreditCard size={13} strokeWidth={2.2} />} text={car.matricula} />
              )}
              {car.bastidor && (
                <Chip icon={<Barcode size={13} strokeWidth={2.2} />} text={car.bastidor} />
              )}
            </div>
          </>
        )}
      </div>

      {/* Esquina superior derecha: kebab "..." circular + dropdown (mockup).
          Reemplaza los dos botones Editar / Exportar CSV que había antes;
          la acción sigue siendo la misma, solo cambia la presentación
          (kebab → menú) como en VehicleCard. */}
      {!showEditCar && (
        <div className="flex items-start gap-2 pt-0.5 flex-shrink-0">
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="Más acciones"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
              style={{ color: KEBAB_COLOR }}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreHorizontal size={20} />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 min-w-[180px] bg-white border border-[var(--border-color)] rounded-xl shadow-lg z-20 py-1"
              >
                <Link
                  href={`/coches/${car.id}/editar`}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--bg-secondary)]"
                  onClick={() => setMenuOpen(false)}
                >
                  <Edit size={16} className="text-[var(--text-muted)]" /> Editar
                </Link>
                <a
                  href={`/api/car/${car.id}/export`}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--bg-secondary)]"
                  onClick={() => setMenuOpen(false)}
                  download
                >
                  <Download size={16} className="text-[var(--text-muted)]" /> Exportar CSV
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Chip pequeño con icono a la izquierda (estilo mockup):
// fondo gris claro, icono gris oscuro, texto gris medio. Mismo tamaño en
// móvil y escritorio (no escala con sm: como el resto de la card).
function Chip({
  icon,
  text,
}: { icon: React.ReactNode; text: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] font-medium"
      style={{ background: HEADER_ICON_BG, color: TEXT_GRAY }}
    >
      <span style={{ color: "#4a4548" }} aria-hidden>{icon}</span>
      <span className="truncate max-w-[140px]" title={text}>{text}</span>
    </span>
  );
}