"use client";

// Pestaña "Documentos" del detalle del coche — mockup: cabecera con tabs
// Documentos/Notas, buscador + filtro, lista de documentos categorizados y
// zona de subida. CarDetailClient la muestra en lugar del Resumen (pestaña
// real, no scroll dentro de la misma página) cuando el usuario pulsa
// "Documentos" en el navbar contextual — ver CarViewContext.tsx.

import { useMemo, useState } from "react";
import { Search, Filter, FileText, UploadCloud } from "lucide-react";
import Modal from "@/components/Modal";
import DocumentRow, { OtrosRow, formatDDMMYYYY } from "./DocumentRow";
import UploadDocumentModal from "./UploadDocumentModal";
import DocumentPreviewModal from "./DocumentPreviewModal";
import NotesTab from "./NotesTab";
import { DOCUMENT_TYPES, type DocumentTypeId } from "@/lib/documents/catalog";
import type { CarDocuments } from "@/lib/db/attachments";
import type { Attachment, Note } from "../lib/types";
import { TEXT_DARK, TEXT_GRAY } from "@/lib/constants";

interface DocumentsSectionProps {
  documents: CarDocuments;
  notes: Note[];
  uploading: boolean;
  uploadDocument: (opts: { file: File | Blob; filename?: string; documentType?: string | null; validUntil?: string | null }) => Promise<boolean>;
  updateDocumentMeta: (id: number, fields: { document_type?: string | null; valid_until?: string | null }) => Promise<void>;
  deleteDocument: (id: number) => Promise<void>;
  addNote: (content: string) => Promise<void>;
  deleteNote: (id: number) => Promise<void>;
}

type StatusFilter = "todos" | "vigentes" | "caducados";

function isExpired(validUntil: string): boolean {
  return validUntil < new Date().toISOString().slice(0, 10);
}

export default function DocumentsSection({
  documents, notes, uploading,
  uploadDocument, updateDocumentMeta, deleteDocument,
  addNote, deleteNote,
}: DocumentsSectionProps) {
  const [tab, setTab] = useState<"documentos" | "notas">("documentos");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");

  const [uploadPreset, setUploadPreset] = useState<DocumentTypeId | "otros" | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  // Se incrementa cada vez que se abre el modal para forzar un remount limpio
  // (UploadDocumentModal no resetea su estado interno en un efecto — evita
  // "setState en efecto" — así que el reset lo hace React al desmontar/montar).
  const [uploadKey, setUploadKey] = useState(0);
  const [previewTarget, setPreviewTarget] = useState<Attachment | null>(null);
  const [editDateTarget, setEditDateTarget] = useState<Attachment | null>(null);
  const [editDateValue, setEditDateValue] = useState("");
  const [showOtros, setShowOtros] = useState(false);

  const q = query.trim().toLowerCase();

  const visibleTypes = useMemo(() => {
    return DOCUMENT_TYPES.filter((def) => {
      const att = documents.byType[def.id];
      if (q && !def.label.toLowerCase().includes(q)) return false;
      if (statusFilter === "todos") return true;
      if (!att?.valid_until || def.id === "revision") return false;
      const expired = isExpired(att.valid_until);
      return statusFilter === "vigentes" ? !expired : expired;
    });
  }, [q, statusFilter, documents]);

  const otrosVisible = useMemo(() => {
    if (statusFilter !== "todos") return false;
    if (q && !"otros documentos".includes(q)) {
      return documents.otros.some((a) => a.original_name.toLowerCase().includes(q));
    }
    return true;
  }, [q, statusFilter, documents]);

  function openUpload(preset: DocumentTypeId | "otros" | null) {
    setUploadPreset(preset);
    setUploadKey((k) => k + 1);
    setShowUpload(true);
  }

  function openEditDate(a: Attachment) {
    setEditDateTarget(a);
    setEditDateValue(a.valid_until || "");
  }

  async function saveEditDate() {
    if (!editDateTarget) return;
    await updateDocumentMeta(editDateTarget.id, { valid_until: editDateValue || null });
    setEditDateTarget(null);
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-6 border-b" style={{ borderColor: "var(--border-color)" }}>
        <TabButton active={tab === "documentos"} onClick={() => setTab("documentos")}>Documentos</TabButton>
        <TabButton active={tab === "notas"} onClick={() => setTab("notas")}>Notas</TabButton>
      </div>

      {tab === "notas" ? (
        <div className="pt-4">
          <NotesTab notes={notes} onAdd={addNote} onDelete={deleteNote} />
        </div>
      ) : (
        <div className="pt-4 space-y-4">
          {/* Buscador + filtro */}
          <div className="flex items-center gap-2">
            <div className="input-wrapper flex-1">
              <span className="input-icon"><Search size={16} /></span>
              <input
                type="text"
                className="input"
                placeholder="Buscar documento..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              aria-label="Filtrar"
              onClick={() => setFilterOpen((v) => !v)}
              className="w-[42px] h-[42px] flex items-center justify-center rounded-lg border flex-shrink-0"
              style={{
                borderColor: "var(--border-color)",
                background: filterOpen ? "var(--bg-secondary)" : "var(--bg-card)",
                color: TEXT_DARK,
              }}
            >
              <Filter size={16} />
            </button>
          </div>

          {filterOpen && (
            <div className="flex items-center gap-1.5">
              {(["todos", "vigentes", "caducados"] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold capitalize"
                  style={statusFilter === f
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "var(--bg-secondary)", color: TEXT_GRAY }}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          <h2 className="text-[15px] font-bold flex items-center gap-2" style={{ color: TEXT_DARK }}>
            <FileText size={16} style={{ color: "var(--accent)" }} />
            Documentos del vehículo
          </h2>

          <div className="space-y-2">
            {visibleTypes.map((def) => (
              <DocumentRow
                key={def.id}
                def={def}
                attachment={documents.byType[def.id]}
                onView={(a) => setPreviewTarget(a)}
                onEditDate={openEditDate}
                onDelete={(a) => deleteDocument(a.id)}
                onUpload={() => openUpload(def.id)}
              />
            ))}
            {otrosVisible && (
              <OtrosRow files={documents.otros} onOpen={() => setShowOtros(true)} />
            )}
          </div>

          {/* Zona de subida */}
          <div
            className="rounded-xl border border-dashed flex flex-col items-center justify-center gap-3 py-8 px-4 text-center"
            style={{ borderColor: "var(--border-color)" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "#fde7e6", color: "var(--accent)" }}
              aria-hidden
            >
              <UploadCloud size={22} />
            </div>
            <p className="text-sm font-bold" style={{ color: TEXT_DARK }}>Subir documento</p>
            <p className="text-xs" style={{ color: TEXT_GRAY }}>Arrastra y suelta aquí o selecciona archivos</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm text-xs"
              onClick={() => openUpload(null)}
            >
              Seleccionar archivos
            </button>
          </div>
        </div>
      )}

      {/* Modal subir/escanear documento */}
      <UploadDocumentModal
        key={uploadKey}
        open={showUpload}
        presetType={uploadPreset}
        uploading={uploading}
        onClose={() => setShowUpload(false)}
        onUpload={async (opts) => {
          const ok = await uploadDocument(opts);
          if (ok) setShowUpload(false);
        }}
      />

      {/* Modal editar fecha */}
      <Modal open={!!editDateTarget} onClose={() => setEditDateTarget(null)} title="Editar fecha de caducidad" mainId="page-main">
        <div className="space-y-3">
          <label className="text-xs font-semibold" style={{ color: TEXT_GRAY }}>Válido hasta</label>
          <input
            type="date"
            className="input"
            value={editDateValue}
            onChange={(e) => setEditDateValue(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary btn-sm text-xs" onClick={() => setEditDateTarget(null)}>Cancelar</button>
            <button type="button" className="btn btn-primary btn-sm text-xs" onClick={saveEditDate}>Guardar</button>
          </div>
        </div>
      </Modal>

      {/* Modal "Otros documentos" — lista + ver/eliminar cada archivo */}
      <Modal open={showOtros} onClose={() => setShowOtros(false)} title="Otros documentos" totalCount={documents.otros.length} mainId="page-main">
        <div className="space-y-2">
          {documents.otros.length === 0 && (
            <p className="text-sm" style={{ color: TEXT_GRAY }}>Sin archivos todavía.</p>
          )}
          {documents.otros.map((a) => (
            <div key={a.id} className="card !p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: TEXT_DARK }}>{a.original_name}</p>
                <p className="text-xs" style={{ color: TEXT_GRAY }}>{formatDDMMYYYY(a.created_at)} · {(a.file_size / 1024).toFixed(0)}KB</p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm text-xs" onClick={() => setPreviewTarget(a)}>Ver</button>
              <button type="button" className="btn btn-sm text-xs" style={{ color: "#dc2626" }} onClick={() => deleteDocument(a.id)}>Eliminar</button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary btn-sm text-xs w-full justify-center"
            onClick={() => { setShowOtros(false); openUpload("otros"); }}
          >
            Añadir archivo
          </button>
        </div>
      </Modal>

      {/* Visor fullscreen */}
      <DocumentPreviewModal attachment={previewTarget} onClose={() => setPreviewTarget(null)} />
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pb-3 text-[14px] font-semibold border-b-2 -mb-px transition-colors"
      style={active
        ? { color: "var(--accent)", borderColor: "var(--accent)" }
        : { color: TEXT_GRAY, borderColor: "transparent" }}
    >
      {children}
    </button>
  );
}
