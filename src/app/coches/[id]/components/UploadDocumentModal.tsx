"use client";

// Modal "Subir documento": dos vías de entrada (Seleccionar archivos /
// Escanear) que confluyen en el mismo formulario pequeño (categoría +
// fecha opcional). El flujo de escaneo hace detección de bordes real:
// captura una foto con la cámara nativa (<input capture="environment">,
// no hay preview en vivo — ver nota abajo), y luego recorta/corrige la
// perspectiva con jscanify + OpenCV.js, ambos cargados con import()
// dinámico para no meter varios MB de WASM en el bundle principal.
//
// "Usar foto original sin recortar" es la vía de escape: la detección de
// bordes sobre una foto real no siempre acierta, así que el usuario
// siempre puede seguir con la foto tal cual salió de la cámara.

import { useRef, useState } from "react";
import { Upload, Camera, X, RotateCcw } from "lucide-react";
import Modal from "@/components/Modal";
import { DOCUMENT_TYPES, type DocumentTypeId } from "@/lib/documents/catalog";
import { TEXT_DARK, TEXT_GRAY } from "@/lib/constants";

type Step = "choose" | "scanning" | "scanPreview" | "scanFailed" | "form";

interface UploadDocumentModalProps {
  open: boolean;
  presetType: DocumentTypeId | "otros" | null;
  uploading: boolean;
  onClose: () => void;
  onUpload: (opts: { file: File | Blob; filename?: string; documentType?: string | null; validUntil?: string | null }) => Promise<void>;
}

export default function UploadDocumentModal({
  open, presetType, uploading, onClose, onUpload,
}: UploadDocumentModalProps) {
  const [step, setStep] = useState<Step>("choose");
  const [category, setCategory] = useState<DocumentTypeId | "otros" | "">(presetType || "");
  const [validUntil, setValidUntil] = useState("");
  const [finalFile, setFinalFile] = useState<File | Blob | null>(null);
  const [finalFilename, setFinalFilename] = useState("documento.jpg");

  const [originalPhoto, setOriginalPhoto] = useState<File | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  function handlePlainFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFinalFile(file);
    setFinalFilename(file.name);
    setStep("form");
  }

  async function handleCameraCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setOriginalPhoto(file);
    setStep("scanning");
    await processScan(file);
  }

  async function processScan(file: File) {
    try {
      const img = await loadImage(file);

      const opencvMod: any = await import("@techstark/opencv-js");
      const cvModule = opencvMod.default ?? opencvMod;
      const cv = await readyOpenCv(cvModule);
      (window as any).cv = cv;

      const jscanifyMod = await import("jscanify/client");
      const JScanify = jscanifyMod.default;
      const scanner = new JScanify();

      const canvas = scanner.extractPaper(img, img.naturalWidth, img.naturalHeight);
      const origUrl = URL.createObjectURL(file);
      setOriginalUrl(origUrl);

      if (!canvas) {
        setStep("scanFailed");
        return;
      }

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b: Blob | null) => resolve(b), "image/jpeg", 0.92));
      if (!blob) {
        setStep("scanFailed");
        return;
      }
      setProcessedBlob(blob);
      setProcessedUrl(URL.createObjectURL(blob));
      setStep("scanPreview");
    } catch {
      const origUrl = URL.createObjectURL(file);
      setOriginalUrl(origUrl);
      setStep("scanFailed");
    }
  }

  function useProcessed() {
    if (!processedBlob) return;
    setFinalFile(processedBlob);
    setFinalFilename("documento-escaneado.jpg");
    setStep("form");
  }

  function useOriginal() {
    if (!originalPhoto) return;
    setFinalFile(originalPhoto);
    setFinalFilename(originalPhoto.name);
    setStep("form");
  }

  function retry() {
    setStep("choose");
    setOriginalPhoto(null);
    setProcessedUrl(null);
    setProcessedBlob(null);
    setOriginalUrl(null);
  }

  async function confirm() {
    if (!finalFile || !category) return;
    await onUpload({
      file: finalFile,
      filename: finalFilename,
      documentType: category === "otros" ? null : category,
      validUntil: validUntil || null,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Subir documento" mainId="page-main">
      <div className="space-y-4">
        {step === "choose" && (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={handlePlainFile}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCameraCapture}
            />
            <button
              type="button"
              className="btn btn-secondary w-full justify-start gap-3 !py-3"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={18} /> Seleccionar archivos
            </button>
            <button
              type="button"
              className="btn btn-secondary w-full justify-start gap-3 !py-3"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera size={18} /> Escanear
            </button>
          </div>
        )}

        {step === "scanning" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border-color)", borderTopColor: "var(--accent)" }} />
            <p className="text-sm" style={{ color: TEXT_GRAY }}>Detectando bordes del documento...</p>
          </div>
        )}

        {step === "scanPreview" && processedUrl && (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={processedUrl} alt="Documento escaneado" className="w-full rounded-lg border" style={{ borderColor: "var(--border-color)" }} />
            <div className="flex flex-col gap-2">
              <button type="button" className="btn btn-primary text-sm" onClick={useProcessed}>Usar esta</button>
              <button type="button" className="btn btn-secondary text-sm" onClick={retry}>
                <RotateCcw size={14} /> Reintentar
              </button>
              <button type="button" className="btn btn-secondary text-sm" onClick={useOriginal}>
                Usar foto original sin recortar
              </button>
            </div>
          </div>
        )}

        {step === "scanFailed" && (
          <div className="space-y-3">
            {originalUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={originalUrl} alt="Foto original" className="w-full rounded-lg border" style={{ borderColor: "var(--border-color)" }} />
            )}
            <p className="text-xs" style={{ color: TEXT_GRAY }}>
              No se detectó el documento automáticamente. Puedes usar la foto tal cual o volver a intentarlo.
            </p>
            <div className="flex flex-col gap-2">
              <button type="button" className="btn btn-primary text-sm" onClick={useOriginal}>Usar foto original</button>
              <button type="button" className="btn btn-secondary text-sm" onClick={retry}>
                <RotateCcw size={14} /> Reintentar
              </button>
            </div>
          </div>
        )}

        {step === "form" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: TEXT_DARK }}>{finalFilename}</p>
              <button
                type="button"
                aria-label="Quitar archivo"
                className="p-1 text-[var(--text-muted)] hover:text-red-500"
                onClick={() => setStep("choose")}
              >
                <X size={16} />
              </button>
            </div>

            {!presetType && (
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: TEXT_GRAY }}>Categoría</label>
                <select
                  className="select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocumentTypeId | "otros")}
                >
                  <option value="">Selecciona una categoría</option>
                  {DOCUMENT_TYPES.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                  <option value="otros">Otros</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: TEXT_GRAY }}>Válido hasta (opcional)</label>
              <input type="date" className="input" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>

            <button
              type="button"
              className="btn btn-primary w-full"
              disabled={!category || uploading}
              onClick={confirm}
            >
              {uploading ? "Subiendo..." : "Guardar documento"}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/** @techstark/opencv-js expone el módulo listo de formas distintas según la
 *  build: puede ser directamente una Promise, un objeto ya inicializado
 *  (con `.Mat`), o un módulo Emscripten pendiente de `onRuntimeInitialized`. */
async function readyOpenCv(cvModule: any): Promise<any> {
  if (cvModule instanceof Promise) return cvModule;
  if (cvModule.Mat) return cvModule;
  await new Promise<void>((resolve) => { cvModule.onRuntimeInitialized = () => resolve(); });
  return cvModule;
}
