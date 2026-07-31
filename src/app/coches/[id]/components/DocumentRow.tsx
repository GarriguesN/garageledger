"use client";

// Fila de la pestaña "Documentos" — 1:1 con el mockup: icono cuadrado con
// fondo de color, título + subtítulo, badge de vigencia (solo si el
// documento tiene valid_until), columna de fecha/"Subido" a la derecha y
// kebab "..." con Ver / Editar fecha / Eliminar.

import { useEffect, useRef, useState } from "react";
import {
  FileText, Shield, Wrench, Euro, CheckCircle2, AlertTriangle,
  MoreVertical, Eye, Calendar, Trash2, Upload, FolderOpen,
  type LucideIcon,
} from "lucide-react";
import type { DocumentTypeDef } from "@/lib/documents/catalog";
import type { Attachment } from "../lib/types";
import { TEXT_DARK, TEXT_GRAY } from "@/lib/constants";

const ICONS: Record<string, LucideIcon> = { FileText, Shield, Wrench, Euro };

export function formatDDMMYYYY(d: string): string {
  const date = d.length === 10 ? new Date(`${d}T12:00:00`) : new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function isExpired(validUntil: string): boolean {
  return validUntil < new Date().toISOString().slice(0, 10);
}

function DocIcon({ def }: { def: DocumentTypeDef }) {
  if (def.icon === "ITV_BADGE") {
    return (
      <span className="text-[13px] font-extrabold tracking-tight" style={{ color: def.fg }}>
        ITV
      </span>
    );
  }
  const Icon = ICONS[def.icon] || FileText;
  return <Icon size={22} strokeWidth={2} style={{ color: def.fg }} />;
}

interface DocumentRowProps {
  def: DocumentTypeDef;
  attachment: Attachment | null;
  onView: (a: Attachment) => void;
  onEditDate: (a: Attachment) => void;
  onDelete: (a: Attachment) => void;
  onUpload: () => void;
}

export default function DocumentRow({
  def, attachment, onView, onEditDate, onDelete, onUpload,
}: DocumentRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }
  }, [menuOpen]);

  if (!attachment) {
    return (
      <button
        type="button"
        onClick={onUpload}
        className="card !p-4 flex items-center gap-3 w-full text-left"
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: def.bg }}
          aria-hidden
        >
          <DocIcon def={def} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold" style={{ color: TEXT_DARK }}>{def.label}</p>
          <p className="text-[13px]" style={{ color: TEXT_GRAY }}>Sin subir todavía</p>
        </div>
        <Upload size={16} style={{ color: TEXT_GRAY }} />
      </button>
    );
  }

  const subtitle = def.id === "revision"
    ? `Realizada el ${formatDDMMYYYY(attachment.valid_until || attachment.created_at)}`
    : attachment.valid_until
      ? `Válido hasta el ${formatDDMMYYYY(attachment.valid_until)}`
      : null;

  const expired = attachment.valid_until && def.id !== "revision" ? isExpired(attachment.valid_until) : false;

  return (
    <div className="card !p-4 flex items-center gap-3">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: def.bg }}
        aria-hidden
      >
        <DocIcon def={def} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold truncate" style={{ color: TEXT_DARK }}>{def.label}</p>
        {subtitle && <p className="text-[13px] mt-0.5" style={{ color: TEXT_GRAY }}>{subtitle}</p>}
        {attachment.valid_until && def.id !== "revision" && (
          <span
            className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={expired
              ? { background: "#fde7e6", color: "var(--accent)" }
              : { background: "#e6f3ec", color: "var(--success)" }}
          >
            {expired ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
            {expired ? "Caducado" : "En vigor"}
          </span>
        )}
      </div>

      <div className="flex flex-col items-end gap-0.5 flex-shrink-0 text-right">
        <span className="text-[11px]" style={{ color: TEXT_GRAY }}>{formatDDMMYYYY(attachment.created_at)}</span>
        <span className="text-[11px]" style={{ color: TEXT_GRAY }}>Subido</span>
      </div>

      <div ref={menuRef} className="relative flex-shrink-0">
        <button
          type="button"
          aria-label="Más acciones"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
          style={{ color: TEXT_GRAY }}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <MoreVertical size={18} />
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 min-w-[170px] bg-white border border-[var(--border-color)] rounded-xl shadow-lg z-20 py-1"
          >
            <button
              type="button"
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--bg-secondary)] text-left"
              onClick={() => { setMenuOpen(false); onView(attachment); }}
            >
              <Eye size={16} className="text-[var(--text-muted)]" /> Ver documento
            </button>
            <button
              type="button"
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--bg-secondary)] text-left"
              onClick={() => { setMenuOpen(false); onEditDate(attachment); }}
            >
              <Calendar size={16} className="text-[var(--text-muted)]" /> Editar fecha
            </button>
            <button
              type="button"
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--bg-secondary)] text-left"
              style={{ color: "#dc2626" }}
              onClick={() => { setMenuOpen(false); onDelete(attachment); }}
            >
              <Trash2 size={16} /> Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Fila "Otros documentos" — multi-archivo, sin badge, sin fecha de
 *  vigencia. Muestra el recuento ("N archivos") como en el mockup; el
 *  detalle (ver/eliminar cada archivo) se abre en un modal aparte. */
export function OtrosRow({
  files, onOpen,
}: { files: Attachment[]; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="card !p-4 flex items-center gap-3 w-full text-left">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "#f2f2f3" }}
        aria-hidden
      >
        <FolderOpen size={22} strokeWidth={2} style={{ color: TEXT_GRAY }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold" style={{ color: TEXT_DARK }}>Otros documentos</p>
        <p className="text-[13px]" style={{ color: TEXT_GRAY }}>
          {files.length === 0 ? "Sin archivos" : `${files.length} archivo${files.length === 1 ? "" : "s"}`}
        </p>
      </div>
      {files[0] && (
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0 text-right">
          <span className="text-[11px]" style={{ color: TEXT_GRAY }}>{formatDDMMYYYY(files[0].created_at)}</span>
          <span className="text-[11px]" style={{ color: TEXT_GRAY }}>Subido</span>
        </div>
      )}
    </button>
  );
}
