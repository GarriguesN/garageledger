import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getDb } from "@/lib/db/core";
import { isAllowedMime, safeDownloadFilename } from "@/lib/attachments";
import type { Attachment } from "@/lib/db/attachments";

export const runtime = "nodejs";

function uploadDir(): string {
  return process.env.UPLOAD_DIR || "/opt/garageledger/data/uploads";
}

// RFC 5987 + latin1 fallback for non-ASCII filenames.
// Keeps Content-Disposition parser-safe across browsers.
function contentDisposition(originalName: string, mime: string): string {
  const safe = safeDownloadFilename(originalName);
  const star = encodeURIComponent(safe).replace(/['()]/g, escape);
  return `attachment; filename="${safe}"; filename*=UTF-8''${star}`;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const row = getDb()
    .prepare("SELECT * FROM attachments WHERE id = ?")
    .get(id) as Attachment | undefined;

  if (!row) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Defense in depth: even if the row's MIME is somehow wrong, refuse to
  // serve anything outside the whitelist. Returning octet-stream would still
  // be safe; refusing is stricter and surfaces bad data loudly.
  if (!isAllowedMime(row.mime_type)) {
    return NextResponse.json({ error: "Tipo no permitido" }, { status: 415 });
  }

  // Reject path traversal in stored filename (must resolve under UPLOAD_DIR).
  const stored = path.basename(row.filename);     // strips any dir components
  const dir = uploadDir();
  const fullPath = path.join(dir, stored);
  const resolved = path.resolve(fullPath);
  const root = path.resolve(dir) + path.sep;
  if (!resolved.startsWith(root)) {
    return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
  }
  if (!fs.existsSync(resolved)) {
    return NextResponse.json({ error: "Archivo no disponible" }, { status: 404 });
  }

  const stat = fs.statSync(resolved);
  const stream = fs.createReadStream(resolved);

  // We don't call new Response(stream) directly here because Next on Node needs
  // a Web ReadableStream. Convert: simple pass-through.
  const webStream = new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("data", (chunk: Buffer | string) => {
        const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
        controller.enqueue(new Uint8Array(buf));
      });
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": row.mime_type,
      "Content-Length": String(stat.size),
      "Content-Disposition": contentDisposition(row.original_name, row.mime_type),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
