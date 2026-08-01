"use client";

// Zona de subida del mockup (pasos "Comprobante", "Archivo o foto" y "Foto
// del vehículo"): rectángulo grande de borde discontinuo con icono, título
// y formatos admitidos. Tras elegir archivo se convierte en previsualización
// con acciones de sustituir y quitar.
//
// El <input type="file"> real vive oculto y se dispara desde el área: así el
// objetivo táctil es todo el rectángulo en vez del botón diminuto del
// control nativo.

import { useRef } from "react";
import { motion } from "framer-motion";
import { CloudUpload, X } from "@/design/tokens/icons";
import { colors, duration, easing, hexToRgba, iconSize, radius, strokeWidth } from "@/design/tokens";
import AppButton from "./AppButton";
import { cn } from "./cn";

export interface AppUploadAreaProps {
  label?: string;
  /** Texto principal dentro del área vacía. */
  title: string;
  /** Formatos y tamaño máximo, bajo el título. */
  hint?: string;
  accept: string;
  /** Abre la cámara trasera directamente (documentos, tickets). */
  capture?: boolean;
  /** URL de previsualización: imagen si el archivo es una imagen. */
  previewUrl?: string | null;
  /** Nombre del archivo elegido; se enseña cuando no hay previsualización
   *  visual (PDF). */
  filename?: string | null;
  onSelect: (file: File) => void;
  onRemove?: () => void;
  /** Acción extra bajo el área (p. ej. "Escanear con la cámara"). */
  secondaryAction?: React.ReactNode;
  /** Proporción del recuadro: la foto del vehículo es apaisada. */
  aspect?: "video" | "auto";
  error?: string;
  className?: string;
}

export default function AppUploadArea({
  label, title, hint, accept, capture = false,
  previewUrl, filename, onSelect, onRemove, secondaryAction,
  aspect = "auto", error, className,
}: AppUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFile = !!previewUrl || !!filename;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Se limpia el valor para que elegir el mismo archivo dos veces seguidas
    // vuelva a disparar el evento.
    e.target.value = "";
    if (file) onSelect(file);
  }

  return (
    <div className={cn("w-full", className)}>
      {label && <p className="mb-2 text-caption font-medium text-text-secondary">{label}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        {...(capture ? { capture: "environment" as const } : {})}
        onChange={handleChange}
        className="hidden"
      />

      {hasFile ? (
        <div className="space-y-3">
          {previewUrl ? (
            <div
              className={cn(
                "relative w-full overflow-hidden border border-border",
                aspect === "video" && "aspect-video",
              )}
              style={{ borderRadius: radius.image, backgroundColor: colors.surfaceElevated }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={filename ?? "Archivo seleccionado"}
                className={cn("w-full object-cover", aspect === "video" ? "size-full" : "h-auto")}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-chip border border-border bg-surface-elevated p-4">
              <span className="min-w-0 truncate text-body font-medium text-text">{filename}</span>
            </div>
          )}

          <div className="flex gap-3">
            <AppButton variant="secondary" size="lg" icon="rotate" onClick={() => inputRef.current?.click()}>
              Sustituir
            </AppButton>
            {onRemove && (
              <AppButton variant="ghost" size="lg" icon="delete" onClick={onRemove}>
                Quitar
              </AppButton>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.99 }}
            transition={{ duration: duration.press, ease: easing.out }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 border border-dashed p-8 text-center transition-colors",
              aspect === "video" && "aspect-video",
              error ? "border-danger" : "border-border hover:border-text-muted",
            )}
            style={{
              borderRadius: radius.image,
              backgroundColor: hexToRgba(colors.surfaceElevated, 0.6),
            }}
          >
            <CloudUpload
              size={iconSize.xl}
              strokeWidth={strokeWidth.default}
              aria-hidden="true"
              className="text-text-secondary"
            />
            <span className="text-body font-semibold text-text">{title}</span>
            {hint && <span className="text-caption text-text-muted">{hint}</span>}
          </motion.button>

          {secondaryAction}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Cabecera de archivo con acción de quitar, para listas de adjuntos ya
 *  subidos dentro de un paso (mockup 17). */
export function AppFileRow({
  filename, size, onRemove,
}: {
  filename: string;
  size?: string;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-chip border border-border bg-surface-elevated p-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium text-text">{filename}</span>
        {size && <span className="mt-0.5 block text-caption text-text-muted">{size}</span>}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Quitar ${filename}`}
          className="inline-flex size-11 shrink-0 items-center justify-center text-text-secondary"
        >
          <X size={iconSize.md} strokeWidth={strokeWidth.default} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
