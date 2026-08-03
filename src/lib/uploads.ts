// Dónde viven los archivos subidos y cómo se llega a ellos con seguridad.
//
// `src/lib/attachments.ts` se mantiene puro a propósito (reglas de validación,
// testeables sin tocar disco). Todo lo que necesita el sistema de archivos vive
// aquí, y aquí estaba la duplicación: `uploadDir()` estaba copiado en las dos
// rutas de adjuntos, y la comprobación de path traversal solo en una.

import fs from "fs";
import path from "path";

export function uploadDir(): string {
  return process.env.UPLOAD_DIR || "/opt/garageledger/data/uploads";
}

export function ensureUploadDir(): string {
  const dir = uploadDir();
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* ya existe */ }
  return dir;
}

/** Ruta absoluta del archivo de un adjunto.
 *
 *  Devuelve null si el nombre guardado intenta salirse del directorio de
 *  subidas. `path.basename` ya quita los componentes de directorio, pero se
 *  comprueba además que la ruta resuelta caiga dentro: es la misma defensa en
 *  profundidad que ya hacía la ruta de descarga, ahora en un solo sitio para
 *  que no se quede a medias en el siguiente que la necesite. */
export function attachmentFilePath(filename: string): string | null {
  if (!filename) return null;
  const dir = uploadDir();
  const resolved = path.resolve(path.join(dir, path.basename(filename)));
  const root = path.resolve(dir) + path.sep;
  return resolved.startsWith(root) ? resolved : null;
}

/** Borra el archivo de un adjunto. No lanza: que el archivo ya no esté (o que
 *  nunca llegara a escribirse) no es motivo para tumbar la petición que lo
 *  estaba borrando. Devuelve si había algo que borrar. */
export function removeAttachmentFile(filename: string): boolean {
  const full = attachmentFilePath(filename);
  if (!full) return false;
  try {
    fs.unlinkSync(full);
    return true;
  } catch {
    return false;
  }
}
