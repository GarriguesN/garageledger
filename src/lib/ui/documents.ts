// Estado de un documento del vehículo tal y como lo pinta la pantalla 8:
// texto de caducidad y badge de color.
//
// Reglas:
//   sin archivo          → "Sin subir", gris. La fila invita a subirlo.
//   con fecha de validez → Vigente / Próximo (≤30 días) / Caducado.
//   sin fecha            → "Verificado" + "OK". No todos los documentos
//                          caducan (permiso de circulación, ficha técnica).

import type { AccentToken } from "@/design/tokens";
import type { Attachment } from "@/lib/db/attachments";
import { daysUntil, formatDateShort } from "@/lib/format";

export interface DocumentStatusView {
  detail: string;
  status: { label: string; accent: AccentToken };
  /** El texto de caducidad se tiñe del color del estado (solo si urge). */
  highlightDetail: boolean;
}

export function documentStatus(attachment: Attachment | null): DocumentStatusView {
  if (!attachment) {
    return {
      detail: "Sin subir",
      status: { label: "Pendiente", accent: "orange" },
      highlightDetail: false,
    };
  }

  const days = daysUntil(attachment.valid_until);
  if (days === null) {
    return {
      detail: "Verificado",
      status: { label: "OK", accent: "green" },
      highlightDetail: false,
    };
  }

  if (days < 0) {
    return {
      detail: `Caducó el ${formatDateShort(attachment.valid_until)}`,
      status: { label: "Caducado", accent: "danger" },
      highlightDetail: true,
    };
  }

  if (days <= 30) {
    return {
      detail: days === 0 ? "Caduca hoy" : `Caduca en ${days} días`,
      status: { label: "Próximo", accent: "orange" },
      highlightDetail: true,
    };
  }

  return {
    detail: `Válido hasta ${formatDateShort(attachment.valid_until)}`,
    status: { label: "Vigente", accent: "green" },
    highlightDetail: false,
  };
}
