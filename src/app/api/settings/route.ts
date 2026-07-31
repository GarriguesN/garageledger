// Ajustes sueltos de la app (por ahora solo el nombre que se muestra en el
// perfil). Se guardan en la tabla `settings`, que ya existía para el PIN.
//
// La lista blanca de claves es deliberada: sin ella, este endpoint sería un
// almacén de clave/valor arbitrario escribible desde el navegador, y ahí es
// donde acaban guardándose cosas que nadie recuerda haber puesto.

import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db/core";

/** Claves que el cliente puede leer y escribir, con su longitud máxima. */
const ALLOWED: Record<string, { maxLength: number }> = {
  display_name: { maxLength: 40 },
};

export async function GET(req: NextRequest) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key || !(key in ALLOWED)) {
    return NextResponse.json({ error: "Clave no permitida" }, { status: 400 });
  }
  return NextResponse.json({ key, value: getSetting(key) ?? null });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  const { key, value } = (body ?? {}) as { key?: unknown; value?: unknown };
  if (typeof key !== "string" || !(key in ALLOWED)) {
    return NextResponse.json({ error: "Clave no permitida" }, { status: 400 });
  }
  if (typeof value !== "string") {
    return NextResponse.json({ error: "El valor debe ser texto" }, { status: 400 });
  }
  if (value.length > ALLOWED[key].maxLength) {
    return NextResponse.json(
      { error: `Máximo ${ALLOWED[key].maxLength} caracteres` },
      { status: 400 },
    );
  }

  setSetting(key, value);
  return NextResponse.json({ key, value });
}
