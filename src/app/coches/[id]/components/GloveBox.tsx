import {
  FileText, Plus, Trash2, Paperclip, Upload,
  StickyNote, FolderOpen,
} from "lucide-react";
import type { Note, Attachment } from "../lib/types";

interface GloveBoxProps {
  notes: Note[];
  attachments: Attachment[];
  noteContent: string;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onNoteContentChange: (next: string) => void;
  onAddNote: () => void;
  onDeleteNote: (id: number) => void;
  onUploadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPickFile: () => void;
  onDeleteAttachment: (id: number) => void;
}

export default function GloveBox({
  notes, attachments, noteContent, uploading, fileInputRef,
  onNoteContentChange, onAddNote, onDeleteNote,
  onUploadFile, onPickFile, onDeleteAttachment,
}: GloveBoxProps) {
  return (
    <div data-glovebox-anchor>
      <h2 className="text-base font-bold mb-3 flex items-center gap-2">
        <FileText size={16} style={{ color: "var(--accent)" }} /> Guantera
      </h2>

      <div className="card space-y-3">
        {/* Notes */}
        <textarea
          className="input min-h-[60px] resize-none text-sm"
          placeholder="Anade una nota (referencia de pieza, proximo cambio, ...)"
          value={noteContent}
          onChange={(e) => onNoteContentChange(e.target.value)}
        />
        <button
          className="btn btn-primary btn-sm text-xs"
          onClick={onAddNote}
          disabled={!noteContent.trim()}
        >
          <Plus size={14} /> Anadir nota
        </button>

        {notes.length > 0 ? (
          <div className="space-y-1.5">
            {notes.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-2 py-1.5 border-b border-[var(--border-color)] last:border-0"
              >
                <p className="text-sm flex-1">{n.content}</p>
                <button
                  className="btn p-1 text-[var(--text-muted)] hover:text-red-500"
                  onClick={() => onDeleteNote(n.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          // Estado vacío independiente: solo aparece cuando NO hay notas
          // (sea porque nunca se añadió o porque se borraron todas).
          <div className="flex items-center gap-2 py-3 px-2 rounded-md bg-[var(--bg-primary)]/40">
            <StickyNote size={16} className="text-[var(--text-muted)] flex-shrink-0" aria-hidden />
            <p className="text-xs text-[var(--text-muted)]">
              Sin notas todavía. Añade la primera arriba con «Anadir nota».
            </p>
          </div>
        )}

        <hr className="border-[var(--border-color)]" />

        {/* Attachments / File upload */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={onUploadFile}
          />
          <button
            className="btn btn-secondary btn-sm text-xs"
            onClick={onPickFile}
            disabled={uploading}
          >
            <Upload size={14} /> {uploading ? "Subiendo..." : "Subir archivo"}
          </button>
        </div>

        {attachments.length > 0 ? (
          <div className="space-y-1.5">
            {attachments.map((a) => (
              <div key={a.id} className="flex items-center gap-2 py-1 text-sm">
                <Paperclip size={14} className="text-[var(--text-muted)]" />
                <span className="flex-1 truncate">{a.original_name}</span>
                <span className="text-xs text-[var(--text-muted)]">
                  {(a.file_size / 1024).toFixed(0)}KB
                </span>
                <button
                  className="btn p-1 text-[var(--text-muted)] hover:text-red-500"
                  onClick={() => onDeleteAttachment(a.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          // Estado vacío independiente para adjuntos: vive dentro de la MISMA
          // card que las notas pero separado, para que ambas secciones tengan
          // su propio feedback.
          <div className="flex items-center gap-2 py-3 px-2 rounded-md bg-[var(--bg-primary)]/40">
            <FolderOpen size={16} className="text-[var(--text-muted)] flex-shrink-0" aria-hidden />
            <p className="text-xs text-[var(--text-muted)]">
              Sin adjuntos. Sube una factura o foto con «Subir archivo».
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
