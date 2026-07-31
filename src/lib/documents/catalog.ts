// Catálogo de tipos de documento del vehículo (pestaña "Documentos").
// Mismo patrón que src/lib/maintenance/presets.ts: array tipado + icon_key +
// lookup helper. Solo 6 entradas fijas (5 con slot único + "otros" multi-archivo),
// así que no necesita ser tan extensible como el catálogo de mantenimiento.

export type DocumentTypeId =
  | "permiso_circulacion"
  | "itv"
  | "seguro"
  | "revision"
  | "impuesto_circulacion";

export interface DocumentTypeDef {
  id: DocumentTypeId;
  label: string;
  /** Nombre del icono lucide-react, o "ITV_BADGE" para el badge de texto fijo. */
  icon: "FileText" | "ITV_BADGE" | "Shield" | "Wrench" | "Euro";
  bg: string;
  fg: string;
}

export const DOCUMENT_TYPES: DocumentTypeDef[] = [
  { id: "permiso_circulacion", label: "Permiso de circulación", icon: "FileText", bg: "#fde7e6", fg: "var(--accent)" },
  { id: "itv",                 label: "Informe ITV",             icon: "ITV_BADGE", bg: "#fef3c7", fg: "#d97706" },
  { id: "seguro",               label: "Seguro",                  icon: "Shield",   bg: "#e6f3ec", fg: "var(--success)" },
  { id: "revision",             label: "Última revisión",         icon: "Wrench",   bg: "#e7eef7", fg: "#3b82f6" },
  { id: "impuesto_circulacion", label: "Impuesto de circulación", icon: "Euro",     bg: "#f3e8ff", fg: "#8b5cf6" },
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
