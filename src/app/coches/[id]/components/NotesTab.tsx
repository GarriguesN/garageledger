"use client";

// Pestaña "Notas" — patrones recuperados de la antigua GloveBox.tsx
// (git show 3a10293^:.../GloveBox.tsx): textarea + "Añadir nota", filas con
// papelera, estado vacío con StickyNote. Restyled para el layout de tabs
// nuevo (antes vivía dentro de la misma card que los adjuntos).

import { useState } from "react";
import { Plus, Trash2, StickyNote } from "lucide-react";
import type { Note } from "../lib/types";
import { TEXT_DARK, TEXT_GRAY } from "@/lib/constants";

interface NotesTabProps {
  notes: Note[];
  onAdd: (content: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function NotesTab({ notes, onAdd, onDelete }: NotesTabProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!content.trim() || saving) return;
    setSaving(true);
    await onAdd(content);
    setContent("");
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <textarea
        className="input min-h-[70px] resize-none text-sm"
        placeholder="Añade una nota (referencia de pieza, próximo cambio, ...)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-primary btn-sm text-xs"
        onClick={handleAdd}
        disabled={!content.trim() || saving}
      >
        <Plus size={14} /> Añadir nota
      </button>

      {notes.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          {notes.map((n) => (
            <div
              key={n.id}
              className="card !p-3 flex items-start gap-2"
            >
              <p className="text-sm flex-1" style={{ color: TEXT_DARK }}>{n.content}</p>
              <button
                type="button"
                aria-label="Eliminar nota"
                className="p-1 text-[var(--text-muted)] hover:text-red-500"
                onClick={() => onDelete(n.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 py-3 px-3 rounded-md" style={{ background: "var(--bg-secondary)" }}>
          <StickyNote size={16} style={{ color: TEXT_GRAY }} className="flex-shrink-0" aria-hidden />
          <p className="text-xs" style={{ color: TEXT_GRAY }}>
            Sin notas todavía. Añade la primera arriba con «Añadir nota».
          </p>
        </div>
      )}
    </div>
  );
}
