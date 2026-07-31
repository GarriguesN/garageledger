"use client";

// Modal "Subir documento": dos vías de entrada (Seleccionar archivo /
// Escanear) que confluyen en el mismo formulario pequeño (categoría +
// fecha de caducidad opcional).
//
// El escaneo hace detección de bordes real: captura una foto con la cámara
// nativa (<input capture="environment">, sin preview en vivo) y luego
// recorta y corrige la perspectiva con jscanify + OpenCV.js, ambos con
// import() dinámico para no meter varios MB de WASM en el bundle inicial.
//
// "Usar la foto original" es la vía de escape: la detección de bordes sobre
// una foto real no siempre acierta, y el usuario no debe quedarse atascado.

import { useEffect, useRef, useState } from "react";
import {
  AppModal, AppButton, AppSelect, AppDatePicker, AppSkeleton,
} from "@/components/ui";
import { DOCUMENT_TYPES, type DocumentTypeId } from "@/lib/documents/catalog";

type Step = "choose" | "scanning" | "scanPreview" | "scanFailed" | "form";

export interface UploadDocumentModalProps {
  open: boolean;
  presetType: DocumentTypeId | "otros" | null;
  uploading: boolean;
  onClose: () => void;
  onUpload: (opts: {
    file: File | Blob;
    filename?: string;
    documentType?: string | null;
    validUntil?: string | null;
  }) => Promise<void>;
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

  // Las URLs de objeto ocupan memoria hasta que se revocan explícitamente.
  // Se lleva la lista aparte para poder soltarlas todas al desmontar sin
  // depender de qué paso del asistente estuviera activo.
  const objectUrls = useRef<string[]>([]);
  function trackUrl(url: string) {
    objectUrls.current.push(url);
    return url;
  }
  useEffect(() => {
    return () => {
      objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrls.current = [];
    };
  }, []);

  // Al reabrirlo, la categoría vuelve a la que corresponda: si se abrió desde
  // la fila de "Seguro", queda preseleccionada.
  useEffect(() => {
    if (open) setCategory(presetType || "");
  }, [open, presetType]);

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
      setOriginalUrl(trackUrl(URL.createObjectURL(file)));

      if (!canvas) {
        setStep("scanFailed");
        return;
      }

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b: Blob | null) => resolve(b), "image/jpeg", 0.92),
      );
      if (!blob) {
        setStep("scanFailed");
        return;
      }
      setProcessedBlob(blob);
      setProcessedUrl(trackUrl(URL.createObjectURL(blob)));
      setStep("scanPreview");
    } catch {
      setOriginalUrl(trackUrl(URL.createObjectURL(file)));
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
    <AppModal
      open={open}
      onClose={onClose}
      title="Subir documento"
      onBack={step !== "choose" ? retry : undefined}
      footer={
        step === "form" ? (
          <AppButton
            size="lg"
            onClick={confirm}
            disabled={!category || uploading}
            loading={uploading}
          >
            {uploading ? "Subiendo…" : "Guardar documento"}
          </AppButton>
        ) : undefined
      }
    >
      {step === "choose" && (
        <div className="space-y-3">
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
          <AppButton
            variant="secondary"
            size="lg"
            icon="upload"
            onClick={() => fileInputRef.current?.click()}
          >
            Seleccionar archivo
          </AppButton>
          <AppButton
            variant="secondary"
            size="lg"
            icon="camera"
            onClick={() => cameraInputRef.current?.click()}
          >
            Escanear con la cámara
          </AppButton>
        </div>
      )}

      {step === "scanning" && (
        <div className="space-y-3 py-6">
          <AppSkeleton height={220} rounded="image" />
          <p className="text-center text-body text-text-secondary">
            Detectando los bordes del documento…
          </p>
        </div>
      )}

      {step === "scanPreview" && processedUrl && (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={processedUrl}
            alt="Documento escaneado"
            className="w-full rounded-image border border-border"
          />
          <AppButton size="lg" onClick={useProcessed}>
            Usar esta
          </AppButton>
          <AppButton variant="secondary" size="lg" onClick={useOriginal}>
            Usar la foto original sin recortar
          </AppButton>
          <AppButton variant="ghost" size="lg" icon="rotate" onClick={retry}>
            Reintentar
          </AppButton>
        </div>
      )}

      {step === "scanFailed" && (
        <div className="space-y-3">
          {originalUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={originalUrl}
              alt="Foto original"
              className="w-full rounded-image border border-border"
            />
          )}
          <p className="text-caption text-text-secondary">
            No se ha detectado el documento automáticamente. Puedes usar la foto tal cual o
            volver a intentarlo.
          </p>
          <AppButton size="lg" onClick={useOriginal}>
            Usar la foto original
          </AppButton>
          <AppButton variant="ghost" size="lg" icon="rotate" onClick={retry}>
            Reintentar
          </AppButton>
        </div>
      )}

      {step === "form" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-chip border border-border bg-surface-elevated p-3">
            <span className="min-w-0 truncate text-body font-medium text-text">
              {finalFilename}
            </span>
            <button
              type="button"
              aria-label="Quitar archivo"
              onClick={() => setStep("choose")}
              className="shrink-0 text-caption font-semibold text-primary"
            >
              Cambiar
            </button>
          </div>

          {!presetType && (
            <AppSelect
              label="Categoría"
              placeholder="Selecciona una categoría"
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentTypeId | "otros")}
              options={[
                ...DOCUMENT_TYPES.map((d) => ({ value: d.id, label: d.label })),
                { value: "otros", label: "Otros" },
              ]}
            />
          )}

          <AppDatePicker
            label="Válido hasta (opcional)"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
      )}
    </AppModal>
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
  await new Promise<void>((resolve) => {
    cvModule.onRuntimeInitialized = () => resolve();
  });
  return cvModule;
}
