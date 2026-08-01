"use client";

// Pantalla 8: lista de documentos del vehículo.
//
// Un hueco fijo por tipo de documento (seguro, permiso, ITV…) más el cajón
// de "otros". Pulsar una fila con documento lo previsualiza; pulsar una
// vacía abre la subida ya con esa categoría elegida.
//
// Tras subir o borrar se llama a router.refresh(): los datos los sirve el
// Server Component, así que refrescar la ruta es más simple y menos
// propenso a desincronizarse que mantener una copia en estado local.

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppSection, AppDocumentCard, AppButton, AppModal, AppToast,
} from "@/components/ui";
import { useToast } from "@/components/ui/AppToast";
import { DOCUMENT_TYPES, type DocumentTypeId } from "@/lib/documents/catalog";
import { documentStatus } from "@/lib/ui/documents";
import type { CarDocuments, Attachment } from "@/lib/db/attachments";
import DocumentWizard, { type DocumentUpload } from "@/components/wizards/DocumentWizard";

export interface DocumentsClientProps {
  carId: number;
  documents: CarDocuments;
}

export default function DocumentsClient({ carId, documents }: DocumentsClientProps) {
  const router = useRouter();
  const { toast, show, dismiss } = useToast();

  const [uploadFor, setUploadFor] = useState<DocumentTypeId | "otros" | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);
  const [preview, setPreview] = useState<Attachment | null>(null);

  function openUpload(type: DocumentTypeId | "otros" | null) {
    setUploadFor(type);
    // Remonta el asistente para que vuelva al primer paso con la categoría
    // nueva.
    setUploadKey((k) => k + 1);
    setUploadOpen(true);
  }

  // La subida la dispara el asistente; aquí se hace la petición y se
  // refresca la lista, que la sirve el Server Component. Un fallo se lanza
  // para que el asistente lo enseñe en su paso, sin cerrarse.
  async function handleUpload(opts: DocumentUpload) {
    const fd = new FormData();
    fd.append("car_id", String(carId));
    fd.append("file", opts.file, opts.filename);
    if (opts.documentType) fd.append("document_type", opts.documentType);
    if (opts.validUntil) fd.append("valid_until", opts.validUntil);
    if (opts.reminderMonths != null) fd.append("reminder_months", String(opts.reminderMonths));

    const res = await fetch("/api/attachments", { method: "POST", body: fd });
    if (!res.ok) throw new Error("No se pudo subir el documento");
    show("Documento subido");
    router.refresh();
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/attachments?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPreview(null);
      show("Documento eliminado");
      router.refresh();
    } catch {
      show("No se pudo eliminar el documento", "error");
    }
  }

  return (
    <>
      <AppSection>
        <div className="space-y-3">
          {DOCUMENT_TYPES.map((def) => {
            const att = documents.byType[def.id] ?? null;
            const view = documentStatus(att);
            return (
              <AppDocumentCard
                key={def.id}
                icon={def.icon}
                name={def.label}
                detail={view.detail}
                status={view.status}
                highlightDetail={view.highlightDetail}
                onClick={() => (att ? setPreview(att) : openUpload(def.id))}
              />
            );
          })}

          {documents.otros.map((att) => {
            const view = documentStatus(att);
            return (
              <AppDocumentCard
                key={att.id}
                icon="document"
                name={att.original_name}
                detail={view.detail}
                status={view.status}
                highlightDetail={view.highlightDetail}
                onClick={() => setPreview(att)}
              />
            );
          })}
        </div>
      </AppSection>

      <AppButton
        variant="secondary"
        size="lg"
        icon="plus"
        className="mt-4 border-dashed"
        onClick={() => openUpload(null)}
      >
        Añadir documento
      </AppButton>

      <DocumentWizard
        key={uploadKey}
        open={uploadOpen}
        presetType={uploadFor}
        onClose={() => setUploadOpen(false)}
        onUpload={handleUpload}
      />

      <AppModal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.original_name}
        footer={
          preview && (
            <div className="flex gap-3">
              <AppButton
                variant="secondary"
                size="lg"
                icon="download"
                href={`/api/attachments/${preview.id}`}
              >
                Abrir
              </AppButton>
              <AppButton variant="danger" size="lg" onClick={() => handleDelete(preview.id)}>
                Eliminar
              </AppButton>
            </div>
          )
        }
      >
        {preview && <DocumentPreview attachment={preview} />}
      </AppModal>

      <AppToast toast={toast} onDismiss={dismiss} />
    </>
  );
}

/** Previsualización embebida. Las imágenes se muestran directamente; los PDF
 *  en un <iframe>, que es lo que el visor nativo del navegador entiende. */
function DocumentPreview({ attachment }: { attachment: Attachment }) {
  const url = `/api/attachments/${attachment.id}`;

  if (attachment.mime_type.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={attachment.original_name}
        className="w-full rounded-image border border-border"
      />
    );
  }

  if (attachment.mime_type === "application/pdf") {
    return (
      <iframe
        src={url}
        title={attachment.original_name}
        className="h-96 w-full rounded-image border border-border bg-surface-elevated"
      />
    );
  }

  return (
    <p className="py-8 text-center text-body text-text-secondary">
      Este tipo de archivo no se puede previsualizar. Ábrelo para verlo.
    </p>
  );
}
