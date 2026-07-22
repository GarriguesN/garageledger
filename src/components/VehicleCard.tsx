"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import {
  Car, Gauge, Euro, Circle, MoreVertical, Edit, Download, Archive,
  Hash, FileDigit, Fuel,
} from "lucide-react";

interface VehicleCardProps {
  id: string;
  marca: string;
  modelo: string;
  generacion?: string;
  ano: number;
  motor: string;
  matricula: string;
  bastidor: string;
  combustible: string;
  kmActuales: number;
  estado: string;
  gastoMensual: number;
  fotoAttachmentId: number | null;
  archivado?: boolean;
}

const FOTO_PLACEHOLDER_BG = "#e9eaec";   // gris muy suave para placeholder
const ICON_GREY_BG = "#f0f1f3";            // gris claro del cuadradito del icono

const statusColor = (estado: string) => {
  const e = estado.toLowerCase();
  if (e.includes("caducad") || e.includes("taller necesario")) return "var(--accent)"; // critical = Tomato Jam
  if (e.includes("revisar")) return "#f59e0b";                                          // warning = ámbar
  return null;                                                                         // ok → sin badge
};

const gastoInAccent = (estado: string) =>
  !estado.toLowerCase().includes("al día") && !estado.toLowerCase().includes("al dia");

export default function VehicleCard({
  id, marca, modelo, generacion, ano, motor,
  matricula, bastidor, combustible,
  kmActuales, estado, gastoMensual,
  fotoAttachmentId, archivado,
}: VehicleCardProps) {
  const subtitle = [generacion, ano, motor].filter(Boolean).join(" · ");
  const color = statusColor(estado);
  const fotoSrc = fotoAttachmentId ? `/api/attachments/${fotoAttachmentId}` : null;
  const gastoColor = gastoInAccent(estado) ? "var(--accent)" : "var(--text-primary)";

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click or Escape
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
    <Link
      href={`/coches/${id}`}
      className="group block no-underline text-[var(--text-primary)] relative"
    >
      <article
        className={`relative bg-white border border-[var(--border-color)] rounded-2xl overflow-hidden transition-all duration-200
          ${archivado ? "opacity-60" : ""}
          hover:shadow-md hover:border-[var(--accent)]/40
          focus-within:ring-2 focus-within:ring-[var(--accent)]`}
      >
        {/* Header row */}
        <div className="flex items-start gap-3 pt-3.5 px-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-[var(--accent)] group-hover:text-white"
            style={{ background: ICON_GREY_BG }}
            aria-hidden
          >
            <Car size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-tight truncate">
              {marca} {modelo}
            </h2>
            {subtitle && (
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {subtitle}
              </p>
            )}
          </div>
          {color && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full flex-shrink-0"
              style={{
                background: `${color}1A`,
                color: color,
                border: `1px solid ${color}40`,
              }}
            >
              <Circle size={8} fill={color} stroke="none" />
              {estado}
            </span>
          )}
          {/* Kebab dropdown — must NOT navigate */}
          <div ref={menuRef} className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label="Más acciones"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
            >
              <MoreVertical size={18} />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 min-w-[180px] bg-white border border-[var(--border-color)] rounded-xl shadow-lg z-20 py-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Link
                  href={`/coches/${id}/editar`}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--bg-secondary)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Edit size={16} className="text-[var(--text-muted)]" />
                  Editar
                </Link>
                <a
                  href={`/api/car/${id}/export`}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--bg-secondary)]"
                  onClick={(e) => e.stopPropagation()}
                  download
                >
                  <Download size={16} className="text-[var(--text-muted)]" />
                  Exportar CSV
                </a>
                <Link
                  href={`/coches/${id}?archive=1`}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--accent)] hover:bg-[var(--bg-secondary)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Archive size={16} />
                  {archivado ? "Reactivar" : "Archivar"}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Imagen 16:9 */}
        <div className="px-4 mt-3">
          <div
            className="relative w-full aspect-video rounded-xl overflow-hidden border border-[var(--border-color)]"
            style={{ background: FOTO_PLACEHOLDER_BG }}
          >
            {fotoSrc ? (
              <Image
                src={fotoSrc}
                alt={`${marca} ${modelo}`}
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
                <Car size={56} strokeWidth={1.2} />
              </div>
            )}
          </div>
        </div>

        {/* Fila 3-col: Matrícula / Bastidor / Combustible */}
        <div className="px-4 mt-4 grid grid-cols-3 gap-3">
          <Cell icon={<Hash size={18} />} label="Matrícula" value={matricula || "—"} />
          <Cell icon={<FileDigit size={18} />} label="Bastidor (VIN)" value={bastidor || "—"} ellipsis mono />
          <Cell icon={<Fuel size={18} />} label="Combustible" value={combustible || "—"} />
        </div>

        <div className="mx-4 mt-4 border-t border-[var(--border-color)]" />

        {/* Fila 2-col: Kilómetros / Gasto mensual */}
        <div className="px-4 py-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-muted)] flex-shrink-0"
              style={{ background: ICON_GREY_BG }}
              aria-hidden
            >
              <Gauge size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-[var(--text-muted)] leading-tight">Kilómetros</p>
              <p className="text-base font-bold leading-tight">
                {kmActuales.toLocaleString("es-ES")} km
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0"
              style={{ background: "var(--accent)" }}
              aria-hidden
            >
              <Euro size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-[var(--text-muted)] leading-tight">Gasto mensual</p>
              <p
                className="text-base font-bold leading-tight"
                style={{ color: gastoColor }}
              >
                {gastoMensual.toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}€
              </p>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

// One data cell in the 3-column row. Optional `ellipsis` truncates with a
// real title="..." so the user can read full VIN on hover. `mono` makes it
// a bit narrower for long alphanumeric IDs.
function Cell({
  icon, label, value, ellipsis = false, mono = false,
}: { icon: React.ReactNode; label: string; value: string; ellipsis?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="text-[var(--text-muted)] flex-shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] leading-tight">
          {label}
        </p>
        <p
          className={`text-sm font-bold leading-tight ${ellipsis ? "truncate" : ""} ${mono ? "font-mono tracking-tight" : ""}`}
          title={ellipsis && value.length > 14 ? value : undefined}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
