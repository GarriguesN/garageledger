import { NextRequest, NextResponse } from "next/server";
import { createExpense, updateExpense, deleteExpense, getExpenses } from "@/lib/db";
import {
  parseCarId, parseExpenseId, parseTaskId,
  parseAmount, parseDate, parseFloatOrNull, parseIntOrNull,
} from "@/lib/validate";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const carId = parseCarId(searchParams.get("car_id"));
  if (!carId) return NextResponse.json({ error: "car_id inválido o ausente" }, { status: 400 });
  const limit = parseInt(searchParams.get("limit") || "100");
  return NextResponse.json(getExpenses(carId, Number.isFinite(limit) ? limit : 100));
}

// audit:B-7 — Un gasto es el dato más consultado de la app: alimenta las
// métricas, el consumo, la media de kilómetros y las gráficas. Aquí solo se
// validaba el importe, así que `date: "garbage"` se guardaba tal cual y
// `km: "abc"` entraba como TEXT en una columna REAL. Nada fallaba en el
// momento: fallaba después, en comparaciones de fecha que ordenaban mal y en
// medias que salían NaN, lejos de donde se había metido el dato.
//
// `litros` y `km` aceptan null —un gasto de seguro no tiene ni lo uno ni lo
// otro— pero no basura.
interface FieldError { field: string; message: string }

/** ¿El campo viene con algo que valga la pena validar? Ni ausente, ni null,
 *  ni la cadena vacía que mandan los formularios cuando no se rellenan. */
function present(v: unknown): boolean {
  return v !== undefined && v !== null && v !== "";
}

function validateExpenseFields(body: any): FieldError | null {
  if (present(body.date) && !parseDate(body.date)) {
    return { field: "date", message: "La fecha debe tener el formato YYYY-MM-DD" };
  }
  if (present(body.litros)) {
    const litros = parseFloatOrNull(body.litros);
    if (litros === null || litros < 0) return { field: "litros", message: "litros inválido" };
  }
  if (present(body.km)) {
    const km = parseIntOrNull(body.km);
    if (km === null || km < 0) return { field: "km", message: "km inválido" };
  }
  if (present(body.costeTaller) && parseAmount(body.costeTaller) === null) {
    return { field: "costeTaller", message: "costeTaller inválido" };
  }
  return null;
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  const carId = parseCarId(body?.carId);
  if (!carId) return NextResponse.json({ error: "carId requerido" }, { status: 400 });

  const importe = parseAmount(body.importe);
  if (importe === null) {
    return NextResponse.json({ error: "importe inválido" }, { status: 400 });
  }

  const invalid = validateExpenseFields(body);
  if (invalid) return NextResponse.json({ error: invalid.message }, { status: 400 });

  // Se guarda lo ya parseado, no el texto que llegó. Antes se parseaba el
  // importe para validarlo y acto seguido se pasaba `body.importe` en crudo,
  // así que un "65.50" acababa como cadena en una columna REAL.
  const litros = present(body.litros) ? parseFloatOrNull(body.litros) : null;
  const km = present(body.km) ? parseIntOrNull(body.km) : null;
  const costeTaller = present(body.costeTaller) ? parseAmount(body.costeTaller) : null;

  const exp = createExpense(
    carId, body.tipo, importe,
    parseDate(body.date) || new Date().toISOString().split("T")[0],
    body.descripcion || "", body.referencia || "",
    litros, km, costeTaller,
    {
      impuestoCirculacion: (body.tipoId === "impuestos" || body.tipo === "Impuestos") && body.impuesto_circulacion === true,
      maintenanceTaskId: parseTaskId(body.maintenanceTaskId) ?? undefined,
      // Ticket 1.16-fix: el frontend envía scheduleNext explícitamente.
      // Default true (compatibilidad) si la tarea tiene intervalos; el
      // frontend lo pone false para tareas puntuales o cuando el usuario
      // desmarca el checkbox.
      scheduleNext: body.scheduleNext !== false,
      // Ticket 1.17: clave del preset elegido en el form de gasto.
      presetKey: body.presetKey || undefined,
      tipoId: body.tipoId || undefined,
      // Asistente por pasos: forma de pago.
      metodoPago: body.metodoPago || null,
    }
  );
  return NextResponse.json(exp, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  // El frontend envía el id como query param (?id=37) y los campos en el body.
  const id = parseExpenseId(body?.id ?? searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id inválido o ausente" }, { status: 400 });

  const invalid = validateExpenseFields(body);
  if (invalid) return NextResponse.json({ error: invalid.message }, { status: 400 });
  if (present(body.importe) && parseAmount(body.importe) === null) {
    return NextResponse.json({ error: "importe inválido" }, { status: 400 });
  }

  const { id: _, ...fields } = body;
  const updated = updateExpense(id, fields);
  return updated
    ? NextResponse.json(updated)
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseExpenseId(searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id inválido o ausente" }, { status: 400 });
  deleteExpense(id);
  return NextResponse.json({ success: true });
}
