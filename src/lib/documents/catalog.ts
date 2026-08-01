// Catálogo de tipos de documento del vehículo (pantalla 8 del mockup).
//
// Cada tipo tiene un único hueco: subir un seguro nuevo pasa a ser el
// vigente y el anterior deja de mostrarse (no se borra el archivo).
// "otros" es el cajón multiarchivo y por eso no está en esta lista.
//
// El color y el icono se declaran como tokens del sistema, no como hex, de
// modo que un documento hereda exactamente la misma paleta que el resto de
// la app.

import type { IconName } from "@/design/tokens/icons";
import type { AccentToken } from "@/design/tokens";

export type DocumentTypeId =
  | "permiso_circulacion"
  | "itv"
  | "seguro"
  | "revision"
  | "impuesto_circulacion"
  | "ficha_tecnica"
  | "manual";

export interface DocumentTypeDef {
  id: DocumentTypeId;
  label: string;
  icon: IconName;
  accent: AccentToken;
  /** Si caduca, se le pide fecha de validez y se avisa cuando se acerca.
   *  El manual del vehículo no caduca nunca. */
  expires: boolean;
}

export const DOCUMENT_TYPES: DocumentTypeDef[] = [
  { id: "seguro",               label: "Seguro",                  icon: "shield",   accent: "green",  expires: true },
  { id: "permiso_circulacion",  label: "Permiso de circulación",  icon: "document", accent: "blue",   expires: false },
  { id: "itv",                  label: "ITV",                     icon: "success",  accent: "orange", expires: true },
  { id: "ficha_tecnica",        label: "Ficha técnica",           icon: "document", accent: "blue",   expires: false },
  { id: "revision",             label: "Última revisión",         icon: "wrench",   accent: "purple", expires: false },
  { id: "impuesto_circulacion", label: "Impuesto de circulación", icon: "tax",      accent: "purple", expires: true },
  { id: "manual",               label: "Manual del vehículo",     icon: "document", accent: "cyan",   expires: false },
];

export const DOCUMENT_TYPE_MAP = Object.fromEntries(
  DOCUMENT_TYPES.map((d) => [d.id, d]),
) as Record<DocumentTypeId, DocumentTypeDef>;

export function isValidDocumentType(v: unknown): v is DocumentTypeId {
  return typeof v === "string" && v in DOCUMENT_TYPE_MAP;
}

export function getDocumentTypeDef(id: string | null | undefined): DocumentTypeDef | undefined {
  return id ? DOCUMENT_TYPE_MAP[id as DocumentTypeId] : undefined;
}
