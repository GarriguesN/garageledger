"use client";

import { useState } from "react";
import { fetchJsonWithToast, type ToastFn } from "../lib/net";
import type { CarDocuments } from "@/lib/db/attachments";
import type { Note } from "../lib/types";

// Mismo patrón que useExpenseForm/useMaintenanceForm (Fase 1): estado propio
// + mutaciones que llaman a `load()` del padre para refrescar tras cada
// cambio. `notes`/`documents` viven aquí (no en CarDetailClient) porque solo
// la pestaña Documentos los consume; el padre solo necesita pasarlos.

interface UseDocumentsArgs {
  carId: number;
  initialNotes: Note[];
  initialDocuments: CarDocuments;
  load: () => void;
  setToast: ToastFn;
  showToast: (msg: string, type?: "success" | "error", ms?: number) => void;
  showUndoToast: (msg: string, restore: () => Promise<void>) => void;
}

export function useDocuments({
  carId, initialNotes, initialDocuments, load, setToast, showToast, showUndoToast,
}: UseDocumentsArgs) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [documents, setDocuments] = useState<CarDocuments>(initialDocuments);
  const [uploading, setUploading] = useState(false);

  // ── Notas ──
  const addNote = async (content: string) => {
    if (!content.trim()) return;
    const res = await fetchJsonWithToast(
      "/api/notes",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ carId, content }),
        fallback: "No se pudo guardar la nota." },
      setToast,
    );
    if (!res.ok) return;
    showToast("Nota guardada");
    load();
  };

  const deleteNote = async (id: number) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    const res = await fetchJsonWithToast(
      `/api/notes?id=${id}`,
      { method: "DELETE", fallback: "No se pudo eliminar la nota." },
      setToast,
    );
    if (!res.ok) return;
    showUndoToast("Nota eliminada", async () => {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId, content: note.content }),
      });
      load();
    });
    load();
  };

  // ── Documentos ──
  const uploadDocument = async (opts: {
    file: File | Blob;
    filename?: string;
    documentType?: string | null;
    validUntil?: string | null;
  }) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("car_id", String(carId));
    fd.append("file", opts.file, opts.filename);
    if (opts.documentType) fd.append("document_type", opts.documentType);
    if (opts.validUntil) fd.append("valid_until", opts.validUntil);
    const res = await fetchJsonWithToast(
      "/api/attachments",
      { method: "POST", body: fd, fallback: "No se pudo subir el documento." },
      setToast,
    );
    setUploading(false);
    if (!res.ok) return false;
    showToast("Documento subido");
    load();
    return true;
  };

  const updateDocumentMeta = async (id: number, fields: { document_type?: string | null; valid_until?: string | null }) => {
    const res = await fetchJsonWithToast(
      `/api/attachments/${id}`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields),
        fallback: "No se pudo actualizar el documento." },
      setToast,
    );
    if (!res.ok) return;
    showToast("Documento actualizado");
    load();
  };

  // Undo real: el archivo permanece en disco tras el DELETE (solo se borra la
  // fila), así que antes de borrar descargamos sus bytes y, si el usuario
  // deshace, los volvemos a subir como adjunto nuevo — mismo patrón que
  // useExpenseForm.deleteExpWithUndo (recrear vía POST con los datos capturados).
  const deleteDocument = async (id: number) => {
    const all = [...Object.values(documents.byType), ...documents.otros].filter(
      (a): a is NonNullable<typeof a> => a != null,
    );
    const att = all.find((a) => a.id === id);
    if (!att) return;

    let blob: Blob | null = null;
    try {
      const r = await fetch(`/api/attachments/${id}`);
      if (r.ok) blob = await r.blob();
    } catch { /* si falla la descarga, seguimos sin poder deshacer */ }

    const res = await fetchJsonWithToast(
      `/api/attachments?id=${id}`,
      { method: "DELETE", fallback: "No se pudo eliminar el documento." },
      setToast,
    );
    if (!res.ok) return;

    if (blob) {
      showUndoToast("Documento eliminado", async () => {
        await uploadDocument({
          file: blob!,
          filename: att.original_name,
          documentType: att.document_type,
          validUntil: att.valid_until,
        });
      });
    } else {
      showToast("Documento eliminado");
    }
    load();
  };

  return {
    notes, setNotes,
    documents, setDocuments,
    uploading,
    addNote, deleteNote,
    uploadDocument, updateDocumentMeta, deleteDocument,
  };
}
