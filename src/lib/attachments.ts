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

// audit:S-7 — Hasta aquí, todo lo que se validaba lo declaraba el cliente:
// `file.type` lo pone el navegador y la extensión la pone el nombre. Las dos
// se escriben a mano. `validateUpload` comprueba que sean coherentes ENTRE SÍ,
// que ya es algo, pero un HTML renombrado a .png y enviado como image/png pasa
// las dos.
//
// El riesgo real está muy contenido —la descarga fuerza `attachment`, manda
// `nosniff` y solo sirve cuatro MIME—, así que esto no tapa un agujero
// abierto: cierra el único hueco que quedaba, que es que el archivo GUARDADO
// sea lo que dice ser. Cuesta leer ocho bytes.

/** ¿Empieza `buf` por esta secuencia de bytes? */
function startsWith(buf: Uint8Array, sig: number[], offset = 0): boolean {
  if (buf.length < offset + sig.length) return false;
  return sig.every((b, i) => buf[offset + i] === b);
}

/**
 * Deduce el tipo real de un archivo por su firma binaria. Devuelve null si no
 * reconoce ninguna de las que aceptamos — que para lo que sirve aquí es lo
 * mismo que "no permitido".
 *
 * Solo se miran los primeros bytes: es donde vive la firma de los cuatro
 * formatos de la whitelist.
 */
export function sniffMime(buf: Uint8Array): string | null {
  // JPEG: FF D8 FF
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return "image/jpeg";
  // PNG: 89 "PNG" CR LF SUB LF
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // WebP: "RIFF" ···· "WEBP"  (el tamaño va en medio, por eso el offset 8)
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) &&
      startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  // PDF: "%PDF-"
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  return null;
}

/**
 * Comprueba que el contenido real coincide con el MIME declarado. Se llama
 * con el archivo ya en memoria, justo antes de escribirlo a disco.
 */
export function validateUploadContent(buf: Uint8Array, declaredMime: string): UploadCheckResult {
  const actual = sniffMime(buf);
  if (actual === null || actual !== declaredMime) {
    return { ok: false, status: 415, error: "El contenido del archivo no coincide con su tipo" };
  }
  return { ok: true };
}
