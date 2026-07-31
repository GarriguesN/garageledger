"use client";

// "Ver documento" fullscreen. Imágenes: <img> directo (trivialmente seguro).
// PDFs: pdfjs-dist (cargado con import() dinámico, fuera del bundle
// principal) rasteriza cada página a un <canvas> — el PDF nunca pasa por el
// visor nativo del navegador (src/lib/attachments.ts nunca sirve `inline`
// precisamente para evitar ese motor; esto logra lo mismo por otra vía:
// parseamos/rasterizamos nosotros en vez de delegar en el plugin del navegador).

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/Modal";
import type { Attachment } from "../lib/types";
import { TEXT_GRAY } from "@/lib/constants";

interface DocumentPreviewModalProps {
  attachment: Attachment | null;
  onClose: () => void;
}

export default function DocumentPreviewModal({ attachment, onClose }: DocumentPreviewModalProps) {
  const isPdf = attachment?.mime_type === "application/pdf";
  return (
    <Modal
      open={!!attachment}
      onClose={onClose}
      title={attachment?.original_name}
      variant="fullscreen"
      mainId="page-main"
      className="!p-0"
    >
      {attachment && (
        isPdf
          ? <PdfViewer url={`/api/attachments/${attachment.id}`} />
          : <ImageViewer url={`/api/attachments/${attachment.id}`} name={attachment.original_name} />
      )}
    </Modal>
  );
}

function ImageViewer({ url, name }: { url: string; name: string }) {
  return (
    <div className="flex items-center justify-center h-full w-full p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={name} className="max-w-full max-h-full object-contain" />
    </div>
  );
}

function PdfViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const doc = await pdfjsLib.getDocument({ url }).promise;
        if (cancelled) return;

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";

        for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
          if (cancelled) return;
          const page = await doc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "max-w-full h-auto shadow-md mb-3";
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          container.appendChild(canvas);
        }
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("No se pudo cargar la vista previa del PDF.");
          setLoading(false);
        }
      }
    }
    render();
    return () => { cancelled = true; };
  }, [url]);

  return (
    <div className="h-full w-full overflow-y-auto flex flex-col items-center p-4">
      {loading && <p className="text-sm py-8" style={{ color: TEXT_GRAY }}>Cargando documento...</p>}
      {error && <p className="text-sm py-8" style={{ color: TEXT_GRAY }}>{error}</p>}
      <div ref={containerRef} className="flex flex-col items-center w-full" />
    </div>
  );
}
