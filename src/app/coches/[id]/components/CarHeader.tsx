// Header del detalle del coche — versión 1:1 con el mockup.
//
// Mockup: icono del coche en cuadro redondeado a la izquierda, nombre +
// subtítulo (generación · año · motor), chips de Matrícula y Bastidor en
// grid 2 columnas, botón "..." circular a la derecha que abre un dropdown
// con Editar / Exportar CSV (mismo patrón visual que VehicleCard).
//
// NO contiene editor inline. La edición del coche vive exclusivamente en
// `/coches/[id]/editar` y se abre desde el dropdown "Editar" de este header.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Car as CarIcon, Edit, Download,
  CreditCard, Barcode, MoreHorizontal,
} from "lucide-react";
import type { Car } from "../lib/types";

interface CarHeaderProps {
  car: Car;
}

// Paleta local coherente con el rediseño Ticket 1.5 y con VehicleCard.
const HEADER_ICON_BG = "#f2f2f3";
const HEADER_ICON_FG = "#c3423f"; // var(--accent)
const TEXT_DARK = "#211a1e";
const TEXT_GRAY = "#8a8588";
const KEBAB_COLOR = "#c7c7cc";

export default function CarHeader({ car }: CarHeaderProps) {
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
    // El contenedor padre es flex con items-stretch para que las tres
    // columnas (icono, texto, kebab) tengan SIEMPRE la misma altura.
    // El icono del coche ocupa el 100% de esa altura con h-full + flex
    // interno centrado, así el cuadrado gris del coche se iguala
    // verticalmente al bloque de texto (nombre + subtítulo + chips).
    <div className="flex items-stretch gap-3">
      {/* Cuadrado del coche: ocupa toda la altura de la fila, borde
          marcado para destacar la card. */}
      <Link
        href="/"
        aria-label="Volver al Garaje"
        className="flex-0 flex items-center justify-center w-auto px-3 rounded-2xl self-stretch"
        style={{
          background: HEADER_ICON_BG,
          border: "2px solid var(--border-color)",
          minWidth: "64px",
        }}
      >
        <CarIcon size={32} strokeWidth={1.8} style={{ color: HEADER_ICON_FG }} />
      </Link>

      <div className="flex-1 min-w-0 py-0.5">
        {/* Fila 1: nombre grande en negrita */}
        <h1
          className="text-[22px] sm:text-2xl font-extrabold tracking-tight leading-tight"
          style={{ color: TEXT_DARK }}
        >
          {car.marca} {car.modelo}
        </h1>
        {/* Fila 2: subtítulo (generación · año · motor) */}
        <p
          className="text-[13px] sm:text-sm leading-tight mt-1 truncate"
          style={{ color: TEXT_GRAY }}
        >
          {[car.generacion, car.ano, car.motor].filter(Boolean).join(" · ")}
        </p>
        {/* Fila 3: chips de matrícula y bastidor en grid 2 columnas */}
        {(car.matricula || car.bastidor) && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            {car.matricula && (
              <Chip icon={<CreditCard size={13} strokeWidth={2.2} />} text={car.matricula} />
            )}
            {car.bastidor && (
              <Chip icon={<Barcode size={13} strokeWidth={2.2} />} text={car.bastidor} />
            )}
          </div>
        )}
      </div>

      {/* Esquina superior derecha: kebab "..." circular + dropdown (mockup).
          Las opciones Editar / Exportar CSV; Editar navega a /coches/[id]/editar
          (el editor real vive en otra vista), Exportar descarga el CSV. */}
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
    </div>
  );
}

// Chip pequeño con icono a la izquierda (estilo mockup):
// fondo gris claro, icono gris oscuro, texto gris oscuro. Mismo tamaño en
// móvil y escritorio (no escala con sm: como el resto de la card).
function Chip({
  icon,
  text,
}: { icon: React.ReactNode; text: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium"
      style={{ background: HEADER_ICON_BG, color: "#211a1e" }}
    >
      <span style={{ color: "#211a1e" }} aria-hidden>{icon}</span>
      <span className="truncate max-w-[180px]" title={text}>{text}</span>
    </span>
  );
}
