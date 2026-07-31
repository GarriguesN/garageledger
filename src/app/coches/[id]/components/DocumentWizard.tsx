"use client";

// Asistente de "Añadir documento" (mockup 15-17, 3 pasos).
//
//   Paso 1 · Tipo de documento
//     Rejilla 3x2 con los 6 tipos del mockup: Seguro, Permiso de
//     Circulación, ITV, Ficha Técnica, Garantía, Otro.
//   Paso 2 · Documento y expiración
//     Subir archivo (file / cámara / escáner), fecha de expiración.
//   Paso 3 · Recordatorio y resumen
//     Toggle "Recordarme", "Avisarme X antes", summary card.
//
// La lógica de escaneo de bordes (jscanify + opencv) vive aquí dentro del
// paso 2. Es la original de UploadDocumentModal, sin cambios funcionales.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppCard, AppInput, AppDatePicker, AppSelect, AppSkeleton,
  AppTypeTile, AppButton,
  Wizard, WizardSummaryCard,
  type WizardStep, type WizardErrors,
} from "@/components/ui";
import { colors, radius } from "@/design/tokens";
import { Camera, Upload, FileText } from "@/design/tokens/icons";
import { DOCUMENT_TYPES, type DocumentTypeId } from "@/lib/documents/catalog";
import { formatDate } from "@/lib/format";

export type DocType = DocumentTypeId | "otro";

interface DocumentFormValues {
  docType: DocType | "";
  validUntil: string;
  recordar: boolean;
  /** "1 mes antes", "1 semana antes", "1 día antes". */
  avisar: "1m" | "1w" | "1d";
}

const EMPTY: DocumentFormValues = {
  docType: "",
  validUntil: "",
  recordar: true,
  avisar: "1m",
};

const AVISAR_LABEL: Record<DocumentFormValues["avisar"], string> = {
  "1m": "1 mes antes",
  "1w": "1 semana antes",
  "1d": "1 día antes",
};

export interface DocumentWizardProps {
  open: boolean;
  onClose: () => void;
  carId: number;
  presetType: DocType | null;
  onUpload: (opts: {
    file: File | Blob;
    filename?: string;
    documentType?: string | null;
    validUntil?: string | null;
  }) => Promise<void>;
  uploading: boolean;
}

const SCAN_TILES: Array<{ id: DocType; label: string; icon: "shield" | "document" | "success" | "wrench" | "battery" | "fileImage" }> = [
  { id: "seguro", label: "Seguro", icon: "shield" },
  { id: "permiso_circulacion", label: "Permiso de Circulación", icon: "document" },
  { id: "itv", label: "ITV", icon: "success" },
  { id: "ficha_tecnica", label: "Ficha técnica", icon: "document" },
  { id: "manual", label: "Garantía", icon: "wrench" },
  { id: "otro", label: "Otro", icon: "fileImage" },
];

export default function DocumentWizard({
  open, onClose, carId, presetType, onUpload, uploading,
}: DocumentWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<"choose" | "scanning" | "scanPreview" | "scanFailed" | "form">("choose");
  const [form, setForm] = useState<DocumentFormValues>(() => ({
    ...EMPTY,
    docType: presetType ?? "",
  }));
  const [showSuccess, setShowSuccess] = useState(false);
  const [finalFile, setFinalFile] = useState<File | Blob | null>(null);
  const [finalFilename, setFinalFilename] = useState("documento.jpg");

  const [originalPhoto, setOriginalPhoto] = useState<File | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

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

  function setField<K extends keyof DocumentFormValues>(k: K, v: DocumentFormValues[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

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
    if (!finalFile || !form.docType) return;
    await onUpload({
      file: finalFile,
      filename: finalFilename,
      documentType: form.docType === "otro" ? null : form.docType,
      validUntil: form.validUntil || null,
    });
    setShowSuccess(true);
  }

  const steps: WizardStep<DocumentFormValues>[] = [
    {
      id: "type",
      title: "Tipo de documento",
      subtitle: "Selecciona el tipo de documento.",
      fields: ["docType"],
      validate: (v) => (!v.docType ? { docType: "Elige un tipo" } : {}),
      render: (v, set) => (
        <div className="grid grid-cols-2 gap-3">
          {SCAN_TILES.map((t) => (
            <AppTypeTile
              key={t.id}
              icon={t.icon}
              label={t.label}
              active={v.docType === t.id}
              onClick={() => set("docType", t.id)}
            />
          ))}
        </div>
      ),
    },
    {
      id: "file",
      title: "Documento y expiración",
      subtitle: "Añade el documento y su fecha de expiración.",
      fields: [],
      render: (_v, _set) => {
        const setFormAny = (k: "validUntil", v: string) => setField(k, v);
        return (
          <div className="space-y-4">
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

            {step === "choose" && (
              <div className="space-y-3">
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
                <AppButton size="lg" onClick={useProcessed}>Usar esta</AppButton>
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
                <AppButton size="lg" onClick={useOriginal}>Usar la foto original</AppButton>
                <AppButton variant="ghost" size="lg" icon="rotate" onClick={retry}>
                  Reintentar
                </AppButton>
              </div>
            )}

            {step === "form" && (
              <div className="space-y-4">
                <AppCard>
                  <div className="flex items-center justify-between gap-3 rounded-chip border border-border bg-surface-elevated p-3">
                    <span className="flex min-w-0 items-center gap-2 text-body font-medium text-text">
                      <FileText size={16} strokeWidth={1.75} />
                      <span className="truncate">{finalFilename}</span>
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
                </AppCard>
                <AppCard>
                  <AppDatePicker
                    label="Fecha de expiración"
                    value={form.validUntil}
                    onChange={(e) => setFormAny("validUntil", e.target.value)}
                  />
                </AppCard>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "reminder",
      title: "Recordatorio y resumen",
      subtitle: "Configura recordatorio y revisa.",
      fields: [],
      render: (v, set) => (
        <div className="space-y-4">
          <AppCard>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={v.recordar}
                onChange={(e) => set("recordar", e.target.checked)}
                className="size-5 accent-primary"
              />
              <span className="text-body text-text">Recordarme</span>
            </label>
            {v.recordar && (
              <AppSelect
                className="mt-3"
                label="Avisarme"
                value={v.avisar}
                onChange={(e) => set("avisar", e.target.value as DocumentFormValues["avisar"])}
                options={[
                  { value: "1m", label: "1 mes antes" },
                  { value: "1w", label: "1 semana antes" },
                  { value: "1d", label: "1 día antes" },
                ]}
              />
            )}
          </AppCard>
          <WizardSummaryCard
            title="Resumen"
            items={[
              { label: "Tipo", value: SCAN_TILES.find((t) => t.id === v.docType)?.label ?? "—" },
              { label: "Archivo", value: finalFilename },
              { label: "Expiración", value: v.validUntil ? formatDate(v.validUntil) : "—" },
              { label: "Recordatorio", value: v.recordar ? AVISAR_LABEL[v.avisar] : "— desactivado" },
            ]}
          />
        </div>
      ),
    },
  ];

  async function handleSubmit(): Promise<boolean> {
    if (!finalFile || !form.docType) return false;
    await onUpload({
      file: finalFile,
      filename: finalFilename,
      documentType: form.docType === "otro" ? null : form.docType,
      validUntil: form.validUntil || null,
    });
    return true;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-background">
      <Wizard
        steps={steps}
        values={form}
        onChange={(v) => setForm((p) => ({ ...p, ...v }))}
        nextLabel="Siguiente"
        submitLabel="Guardar documento"
        cancelLabel="Cancelar"
        backLabel="Atrás"
        submitting={uploading}
        onSubmit={handleSubmit}
        onClose={onClose}
        success={{
          show: showSuccess,
          subtitle: "Documento guardado correctamente",
          highlight: finalFilename,
          detail: form.validUntil ? `Válido hasta ${formatDate(form.validUntil)}` : undefined,
          primary: {
            label: "Ver documentos",
            onClick: () => {
              setShowSuccess(false);
              router.push(`/coches/${carId}/documentos`);
            },
          },
          secondary: {
            label: "Añadir otro",
            onClick: () => {
              setShowSuccess(false);
              setForm({ ...EMPTY });
              setFinalFile(null);
              setFinalFilename("documento.jpg");
              setStep("choose");
              router.refresh();
            },
          },
        }}
      />
    </div>
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

async function readyOpenCv(cvModule: any): Promise<any> {
  if (cvModule instanceof Promise) return cvModule;
  if (cvModule.Mat) return cvModule;
  await new Promise<void>((resolve) => {
    cvModule.onRuntimeInitialized = () => resolve();
  });
  return cvModule;
}
