import { NextRequest, NextResponse } from "next/server";
import { getExpenses, getCar } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const car = getCar(parseInt(id));
  if (!car) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const expenses = getExpenses(parseInt(id), 9999);
  const headers = ["Fecha","Tipo","Importe","Descripción","Litros","Km","Coste Taller"];
  const rows = expenses.map(e => [
    e.date, e.tipo, e.importe.toFixed(2),
    `"${(e.descripcion || "").replace(/"/g, '""')}"`,
    e.litros ?? "", e.km ?? "", e.coste_estimado_taller?.toFixed(2) ?? "",
  ].join(","));

  const csv = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${car.marca}_${car.modelo}_gastos.csv"`,
    },
  });
}
