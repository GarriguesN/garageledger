"use client";

// Paso de imagen o archivo. Envuelve a <AppUploadArea> con lo que necesita
// un paso del asistente: gestionar la URL de previsualización y soltarla al
// desmontar.
//
// Las URL de objeto viven hasta que se revocan explícitamente; sin esto,
// cada foto probada se queda en memoria hasta recargar la página.

import { useEffect, useMemo } from "react";
import AppUploadArea from "@/components/ui/AppUploadArea";

export interface ImageUploadStepProps {
  label?: string;
  title: string;
  hint?: string;
  accept?: string;
  capture?: boolean;
  /** Archivo elegido en este asistente (null si aún no hay). */
  file: File | Blob | null;
  /** Nombre a enseñar cuando el archivo no es una imagen (PDF). */
  filename?: string | null;
  /** Imagen ya guardada en el servidor (edición de vehículo). */
  initialPreviewUrl?: string | null;
  onSelect: (file: File) => void;
  onRemove?: () => void;
  secondaryAction?: React.ReactNode;
  aspect?: "video" | "auto";
  error?: string;
}

export default function ImageUploadStep({
  label, title, hint, accept = "image/jpeg,image/png,image/webp",
  capture, file, filename, initialPreviewUrl = null,
  onSelect, onRemove, secondaryAction, aspect = "video", error,
}: ImageUploadStepProps) {
  // La URL se deriva del archivo en vez de guardarse en estado: así no hay
  // un render intermedio con la previsualización vacía. El efecto solo se
  // ocupa de soltarla cuando deja de usarse.
  const objectUrl = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  return (
    <AppUploadArea
      label={label}
      title={title}
      hint={hint}
      accept={accept}
      capture={capture}
      previewUrl={objectUrl ?? (file ? null : initialPreviewUrl)}
      filename={filename ?? (file instanceof File ? file.name : null)}
      onSelect={onSelect}
      onRemove={onRemove}
      secondaryAction={secondaryAction}
      aspect={aspect}
      error={error}
    />
  );
}
