// Validation rules for uploads. Pure functions — safe to unit-test.

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Whitelist of MIME types we accept. Order matters in some clients, keep stable.
export const ALLOWED_MIME_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

// Coherent extension ↔ MIME map. Used to detect MIME-laundering (e.g. .html
// renamed to .png). Whitelist of allowed combinations — any mismatch is 415.
const EXT_TO_MIME: Record<string, string> = {
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".webp": "image/webp",
  ".pdf":  "application/pdf",
};

export interface UploadCheckOk {
  ok: true;
}
export interface UploadCheckErr {
  ok: false;
  status: 413 | 415;
  error: string;
}
export type UploadCheckResult = UploadCheckOk | UploadCheckErr;

const EXT_RE = /\.[a-z0-9]{1,8}$/i;

/**
 * Validate an uploaded file before writing to disk.
 * Order: size → mime → extension↔mime coherence.
 */
export function validateUpload(file: { name: string; type: string; size: number }): UploadCheckResult {
  if (!file?.type || !ALLOWED_MIME_TYPES.includes(file.type)) {
    return { ok: false, status: 415, error: "Tipo de archivo no permitido" };
  }

  if (typeof file.size !== "number" || file.size <= 0) {
    return { ok: false, status: 415, error: "Archivo vacío o inválido" };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, status: 413, error: "El archivo supera el tamaño máximo de 10MB" };
  }

  // Check extension coherence with declared MIME.
  const match = file.name ? file.name.match(EXT_RE) : null;
  const ext = match ? match[0].toLowerCase() : "";
  const expected = ext ? EXT_TO_MIME[ext] : undefined;
  if (!ext || !expected) {
    return { ok: false, status: 415, error: "Tipo de archivo no permitido" };
  }
  if (expected !== file.type) {
    return { ok: false, status: 415, error: "Tipo de archivo no permitido" };
  }

  return { ok: true };
}

/**
 * Strip CRLF and quote chars from a user-supplied filename before echoing it
 * back in Content-Disposition. Returns a safe fallback if the result would
 * be empty or contain only "unsafe" bytes.
 */
export function safeDownloadFilename(name: string): string {
  let clean = (name || "adjunto")
    .replace(/[\r\n"]/g, "_")      // kill header-injection vectors
    .replace(/[\\/]/g, "_")        // kill path traversal in the echoed name
    .replace(/[^\x20-\x7e]/g, "_") // strip non-printable ASCII
    .trim();
  if (!clean || clean.startsWith(".")) clean = "adjunto";
  return clean;
}

/**
 * Pick a content-disposition mode that makes sense for the MIME.
 * We never use "inline" — force download to keep any malicious content
 * (e.g. a PDF with embedded JS) out of the browser's rendering pipeline.
 */
export function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mime);
}
