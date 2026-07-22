"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Car, Gauge, Euro, Hash, FileDigit, Fuel,
  MoreVertical, Edit, Download, Archive,
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

// Paleta local de la card (clara, iOS-like). El resto de la app sigue
// usando --accent / --border-color / etc. — esto NO sustituye al design system,
// solo afina el aspecto de las cards del garaje para parecerse al mockup.
const ICON_BG = "#f2f2f3";
const ICON_FG = "#3a3a3c";
const PHOTO_PLACEHOLDER_BG = "#e4e4e6";
const CARD_SHADOW =
  "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)";
const CARD_SHADOW_HOVER =
  "0 2px 6px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.10)";
const TEXT_DARK = "#1c1c1e";
const TEXT_GRAY = "#8a8a8e";
const DIVIDER = "#eeeeef";

const statusColor = (estado: string) => {
  const e = estado.toLowerCase();
  if (e.includes("caducad") || e.includes("taller necesario")) return "#ff3b30"; // critical
  if (e.includes("revisar")) return "#f59e0b";                                  // warning
  return null;                                                                  // ok → sin badge
};

export default function VehicleCard({
  id, marca, modelo, generacion, ano, motor,
  matricula, bastidor, combustible,
  kmActuales, estado, gastoMensual,
  fotoAttachmentId, archivado,
}: VehicleCardProps) {
  const router = useRouter();
  const subtitle = [generacion, ano, motor].filter(Boolean).join(" · ");
  const color = statusColor(estado);
  const fotoSrc = fotoAttachmentId ? `/api/attachments/${fotoAttachmentId}` : null;
  const cardHref = `/coches/${id}`;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Cierra el dropdown con click fuera o Escape (igual que antes)
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

  function onCardClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.defaultPrevented) return;
    router.push(cardHref);
  }
  function onCardKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.defaultPrevented) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      router.push(cardHref);
    }
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={onCardClick}
      onKeyDown={onCardKey}
      className="relative cursor-pointer block no-underline"
      style={{ color: TEXT_DARK }}
    >
      <article
        className={`bg-white border border-[var(--border-color)] rounded-2xl overflow-hidden transition-all duration-200
          ${archivado ? "opacity-60" : ""}
          focus-within:ring-2 focus-within:ring-[var(--accent)]`}
        style={{ boxShadow: CARD_SHADOW }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = CARD_SHADOW_HOVER; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = archivado ? CARD_SHADOW : CARD_SHADOW; }}
      >
        {/* Header: marca/modelo + subtítulo  | badge + kebab */}
        <div className="flex items-start gap-3 pt-[18px] px-[18px]">
          <div className="min-w-0 flex-1">
            <h2 className="text-[19px] font-bold tracking-tight leading-tight truncate">
              {marca} {modelo}
            </h2>
            {subtitle && (
              <p className="text-[13.5px] leading-tight mt-[3px] truncate" style={{ color: TEXT_GRAY }}>
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-[14px] pt-[2px] flex-shrink-0">
            {color && (
              <span
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap"
                style={{ color }}
              >
                <span
                  className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                  style={{ background: color }}
                  aria-hidden
                />
                {estado}
              </span>
            )}
            <div ref={menuRef} className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                aria-label="Más acciones"
                className="w-5 h-5 flex items-center justify-center cursor-pointer transition-colors"
                style={{ color: "#c7c7cc" }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
              >
                <MoreVertical size={20} />
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
        </div>

        {/* Foto 16:9 */}
        <div className="px-[18px] mt-[14px]">
          <div
            className="relative w-full aspect-video rounded-[14px] overflow-hidden"
            style={{ background: PHOTO_PLACEHOLDER_BG }}
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
              <div className="absolute inset-0 flex items-center justify-center" style={{ color: "#a0a0a4" }}>
                <Car size={56} strokeWidth={1.2} />
              </div>
            )}
          </div>
        </div>

        {/* Fila 3-col con divisores verticales finos */}
        <div
          className="flex items-start mt-4 pb-4 mx-[18px]"
          style={{ borderBottom: `1px solid ${DIVIDER}` }}
        >
          <Cell icon={<Hash size={18} />} label="Matrícula" value={matricula || "—"} />
          <VRule />
          <Cell icon={<FileDigit size={18} />} label="Bastidor (VIN)" value={bastidor || "—"} ellipsis />
          <VRule />
          <Cell icon={<Fuel size={18} />} label="Combustible" value={combustible || "—"} />
        </div>

        {/* Fila 2-col con divisor y círculos grises (Euro outline) */}
        <div className="flex items-start px-[18px] pt-4 pb-[18px]">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <RoundIcon><Gauge size={20} strokeWidth={1.7} /></RoundIcon>
            <div className="min-w-0">
              <p className="text-[12.5px] leading-tight" style={{ color: TEXT_GRAY }}>Kilómetros</p>
              <p className="text-[13.5px] font-bold leading-tight mt-[3px]" style={{ color: TEXT_DARK }}>
                {kmActuales.toLocaleString("es-ES")} km
              </p>
            </div>
          </div>
          <VRule />
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <EuroCircle />
            <div className="min-w-0">
              <p className="text-[12.5px] leading-tight" style={{ color: TEXT_GRAY }}>Gasto mensual</p>
              <p className="text-[13.5px] font-bold leading-tight mt-[3px]" style={{ color: TEXT_DARK }}>
                {gastoMensual.toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}€
              </p>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

/* ---------- Helpers internos (estilo mockup) ---------- */

// Celda de la fila superior. Icono con el tamaño y color del mockup.
function Cell({
  icon, label, value, ellipsis = false,
}: { icon: React.ReactNode; label: string; value: string; ellipsis?: boolean }) {
  return (
    <div className="flex items-start gap-2 flex-1 min-w-0">
      <span
        className="w-[22px] h-[22px] flex-shrink-0 mt-[2px]"
        style={{ color: ICON_FG }}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] leading-tight" style={{ color: TEXT_GRAY }}>{label}</p>
        <p
          className={`text-[13.5px] font-bold leading-tight mt-[3px] ${ellipsis ? "truncate" : ""}`}
          style={{
            color: TEXT_DARK,
            wordBreak: ellipsis ? "break-word" : undefined,
            whiteSpace: ellipsis ? "normal" : undefined,
          }}
          title={ellipsis && value.length > 14 ? value : undefined}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

// Separador vertical fino (1px), self-stretch para alinearse a las celdas.
function VRule() {
  return (
    <div
      className="self-stretch flex-shrink-0 mx-2.5"
      style={{ width: "1px", background: DIVIDER, margin: "2px 10px" }}
      aria-hidden
    />
  );
}

// Círculo gris neutro con icono (Gauge, Fuel, etc.).
function RoundIcon({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="w-[22px] h-[22px] flex items-center justify-center flex-shrink-0 mt-[1px] rounded-full"
      style={{ background: ICON_BG, color: ICON_FG }}
      aria-hidden
    >
      {children}
    </span>
  );
}

// Círculo "€" outline 1.6px como en el mockup (negro sobre fondo gris claro).
function EuroCircle() {
  return (
    <span
      className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 mt-[1px] text-[13px] font-semibold"
      style={{
        border: "1.6px solid #3a3a3c",
        background: ICON_BG,
        color: ICON_FG,
      }}
      aria-hidden
    >
      €
    </span>
  );
}
