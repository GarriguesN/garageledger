"use client";

// Asistente de documentos (mockups 15-17).
//
// Paso 1  tipo de documento (rejilla)
// Paso 2  el archivo y su caducidad — subiendo un archivo o escaneando
// Paso 3  recordatorio y resumen
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
  AppButton, AppDatePicker, AppSelect, AppSkeleton, AppToggle, AppTypeTile, AppFileRow,
} from "@/components/ui";
import { Wizard, FormSection, InputCard, SummaryStep, type WizardStepDef } from "@/components/wizard";
import ImageUploadStep from "@/components/wizard/ImageUploadStep";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_MAP, type DocumentTypeId } from "@/lib/documents/catalog";
import { formatDate } from "@/lib/format";

export interface DocumentUpload {
  file: File | Blob;
  filename?: string;
  documentType?: string | null;
  validUntil?: string | null;
  reminderMonths?: number | null;
}

export interface DocumentWizardProps {
  open: boolean;
  onClose: () => void;
  /** Categoría preseleccionada al abrir desde una fila vacía. */
  presetType: DocumentTypeId | "otros" | null;
  onUpload: (opts: DocumentUpload) => Promise<void>;
}

interface DocumentValues {
  categoryId: string;
  file: File | Blob | null;
  filename: string;
  validUntil: string;
  recordar: boolean;
  recordarMeses: string;
}

type ScanState = "idle" | "scanning" | "preview" | "failed";

const REMINDER_OPTIONS = [
  { value: "1", label: "1 mes antes" },
  { value: "2", label: "2 meses antes" },
  { value: "3", label: "3 meses antes" },
  { value: "6", label: "6 meses antes" },
];

const TILES = [
  ...DOCUMENT_TYPES.map((d) => ({ id: d.id as string, label: d.label, icon: d.icon, accent: d.accent })),
  { id: "otros", label: "Otros", icon: "more" as const, accent: "cyan" as const },
];

function expiresFor(categoryId: string): boolean {
  return DOCUMENT_TYPE_MAP[categoryId as DocumentTypeId]?.expires ?? false;
}

export default function DocumentWizard({ open, onClose, presetType, onUpload }: DocumentWizardProps) {
  // El escaneo vive fuera de los valores del asistente: es un proceso, no un
  // dato del formulario. Lo único que acaba en los valores es el archivo.
  const [scan, setScan] = useState<ScanState>("idle");
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [originalPhoto, setOriginalPhoto] = useState<File | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Las URL de objeto ocupan memoria hasta que se revocan explícitamente. Se
  // lleva la lista aparte para poder soltarlas todas al desmontar sin
  // depender de en qué punto del escaneo estuviéramos.
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

  const initialValues: DocumentValues = {
    categoryId: presetType ?? "",
    file: null,
    filename: "",
    validUntil: "",
    recordar: true,
    recordarMeses: "1",
  };

  const steps: WizardStepDef<DocumentValues>[] = [
    {
      id: "tipo",
      title: "Tipo de documento",
      subtitle: "Selecciona el tipo de documento",
      validate: (v) => (v.categoryId ? {} : { categoryId: "Elige un tipo de documento" }),
      render: ({ values, pick, errors }) => (
        <>
          {/* Al tocar el tipo se avanza: es lo único que decide este paso. */}
          <div role="radiogroup" aria-label="Tipo de documento" className="grid grid-cols-2 gap-3">
            {TILES.map((t) => (
              <AppTypeTile
                key={t.id}
                icon={t.icon}
                label={t.label}
                accent={t.accent}
                selected={values.categoryId === t.id}
                onClick={() => pick({ categoryId: t.id })}
              />
            ))}
          </div>
          {errors.categoryId && (
            <p role="alert" className="mt-3 text-caption text-danger">
              {errors.categoryId}
            </p>
          )}
        </>
      ),
    },

    {
      id: "documento",
      title: "Documento y expiración",
      subtitle: "Añade el documento y su fecha de expiración",
      validate: (v) => ({
        file: v.file ? undefined : "Añade el archivo o la foto del documento",
        validUntil:
          expiresFor(v.categoryId) && !v.validUntil
            ? "Este documento caduca: añade la fecha"
            : undefined,
      }),
      render: ({ values, set, patch, errors, fieldRef }) => {
        function applyScanned(blob: Blob | File, filename: string) {
          patch({ file: blob, filename });
          setScan("idle");
        }

        return (
          <FormSection>
            {expiresFor(values.categoryId) && (
              <AppDatePicker
                ref={fieldRef("validUntil")}
                label="Fecha de expiración"
                value={values.validUntil}
                error={errors.validUntil}
                onChange={(e) => set("validUntil", e.target.value)}
              />
            )}

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setOriginalPhoto(file);
                setScan("scanning");
                await processScan(file);
              }}
            />

            {scan === "scanning" && (
              <div className="space-y-3 py-6">
                <AppSkeleton height={220} rounded="image" />
                <p className="text-center text-body text-text-secondary">
                  Detectando los bordes del documento…
                </p>
              </div>
            )}

            {scan === "preview" && processedUrl && (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={processedUrl}
                  alt="Documento escaneado"
                  className="w-full rounded-image border border-border"
                />
                <AppButton
                  size="lg"
                  onClick={() => processedBlob && applyScanned(processedBlob, "documento-escaneado.jpg")}
                >
                  Usar esta
                </AppButton>
                <AppButton
                  variant="secondary"
                  size="lg"
                  onClick={() => originalPhoto && applyScanned(originalPhoto, originalPhoto.name)}
                >
                  Usar la foto original sin recortar
                </AppButton>
                <AppButton variant="ghost" size="lg" icon="rotate" onClick={resetScan}>
                  Reintentar
                </AppButton>
              </div>
            )}

            {scan === "failed" && (
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
                <AppButton
                  size="lg"
                  onClick={() => originalPhoto && applyScanned(originalPhoto, originalPhoto.name)}
                >
                  Usar la foto original
                </AppButton>
                <AppButton variant="ghost" size="lg" icon="rotate" onClick={resetScan}>
                  Reintentar
                </AppButton>
              </div>
            )}

            {scan === "idle" && (
              <div ref={fieldRef("file")}>
                <ImageUploadStep
                  label="Archivo o foto"
                  title="Subir archivo o foto"
                  hint="PDF, JPG, PNG (máx. 10 MB)"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  aspect="auto"
                  file={values.file}
                  filename={values.filename || null}
                  error={errors.file}
                  onSelect={(file) => patch({ file, filename: file.name })}
                  onRemove={() => patch({ file: null, filename: "" })}
                  secondaryAction={
                    <AppButton
                      variant="secondary"
                      size="lg"
                      icon="camera"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      Escanear con la cámara
                    </AppButton>
                  }
                />
              </div>
            )}
          </FormSection>
        );
      },
    },

    {
      id: "recordatorio",
      title: "Recordatorio y resumen",
      subtitle: "Configura el recordatorio y revisa",
      nextLabel: "Guardar documento",
      render: ({ values, set, goTo }) => {
        const def = DOCUMENT_TYPE_MAP[values.categoryId as DocumentTypeId];
        const expires = expiresFor(values.categoryId);
        return (
          <div className="space-y-6">
            {expires && (
              <InputCard>
                <AppToggle
                  label="Recordarme"
                  hint="Aparecerá en tus notificaciones antes de que caduque"
                  checked={values.recordar}
                  onChange={(v) => set("recordar", v)}
                />
                {values.recordar && (
                  <AppSelect
                    label="Avisarme"
                    value={values.recordarMeses}
                    onChange={(e) => set("recordarMeses", e.target.value)}
                    options={REMINDER_OPTIONS}
                  />
                )}
              </InputCard>
            )}

            <SummaryStep
              onEdit={goTo}
              groups={[
                {
                  icon: def?.icon ?? "document",
                  accent: def?.accent ?? "cyan",
                  title: def?.label ?? "Otros",
                  subtitle: expires && values.validUntil
                    ? `Válido hasta ${formatDate(values.validUntil)}`
                    : undefined,
                  editStepId: "documento",
                  rows: [
                    { label: "Expiración", value: expires ? formatDate(values.validUntil) : "No caduca" },
                    {
                      label: "Recordatorio",
                      value: expires
                        ? values.recordar
                          ? REMINDER_OPTIONS.find((o) => o.value === values.recordarMeses)?.label ?? "—"
                          : "Sin recordatorio"
                        : "—",
                    },
                  ],
                },
              ]}
            />

            {values.filename && <AppFileRow filename={values.filename} />}
          </div>
        );
      },
    },
  ];

  function resetScan() {
    setScan("idle");
    setOriginalPhoto(null);
    setProcessedUrl(null);
    setProcessedBlob(null);
    setOriginalUrl(null);
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
        setScan("failed");
        return;
      }

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b: Blob | null) => resolve(b), "image/jpeg", 0.92),
      );
      if (!blob) {
        setScan("failed");
        return;
      }
      setProcessedBlob(blob);
      setProcessedUrl(trackUrl(URL.createObjectURL(blob)));
      setScan("preview");
    } catch {
      setOriginalUrl(trackUrl(URL.createObjectURL(file)));
      setScan("failed");
    }
  }

  async function submit(values: DocumentValues) {
    if (!values.file) throw new Error("Añade el archivo del documento");
    const expires = expiresFor(values.categoryId);

    await onUpload({
      file: values.file,
      filename: values.filename || "documento.jpg",
      documentType: values.categoryId === "otros" ? null : values.categoryId,
      validUntil: expires ? values.validUntil || null : null,
      reminderMonths: expires && values.recordar ? Number.parseInt(values.recordarMeses, 10) : null,
    });

    const def = DOCUMENT_TYPE_MAP[values.categoryId as DocumentTypeId];
    return {
      message: "Documento guardado correctamente",
      headline: def?.label ?? "Documento",
      detail: values.filename || undefined,
      meta: expires && values.validUntil ? `Válido hasta ${formatDate(values.validUntil)}` : undefined,
      primaryLabel: "Ver documentos",
      onPrimary: onClose,
      secondaryLabel: "Añadir otro documento",
    };
  }

  return (
    <Wizard
      open={open}
      title="Añadir documento"
      steps={steps}
      initialValues={initialValues}
      initialStepId={presetType ? "documento" : undefined}
      submitLabel="Guardar documento"
      onSubmit={submit}
      onClose={onClose}
    />
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
