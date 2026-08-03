// audit:S-5 — La exportación a CSV, con datos hostiles dentro.
//
// Se ejecuta el handler real contra una BD temporal y se mira la respuesta
// byte a byte: el CSV que sale y la cabecera Content-Disposition.

import "./lib/test-db";  // primera línea: fija DB_PATH antes de cargar src/lib/db

import { GET } from "../src/app/api/car/[id]/export/route";
import { createExpense } from "../src/lib/db/expenses";
import { createCar } from "../src/lib/db/cars";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean, hint = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label} ${hint}`); }
}

async function exportCsv(carId: number) {
  const req = new Request(`http://localhost/api/car/${carId}/export`);
  const res = await GET(req as never, { params: Promise.resolve({ id: String(carId) }) });
  return { res, body: await res.text() };
}

async function main() {
  console.log("\n=== Exportación CSV ===");

  // ── 1) Fórmulas en la descripción: se neutralizan, no se ejecutan.
  {
    const car = createCar({ marca: "Honda", modelo: "Civic" });
    const payloads = [
      '=HYPERLINK("http://malo/","clic")',
      "+1+1",
      "-2+3",
      "@SUM(A1:A9)",
      "\tcmd",
    ];
    for (const p of payloads) {
      createExpense(car.id, "Otros", 10, "2026-01-15", p);
    }

    const { body } = await exportCsv(car.id);
    for (const p of payloads) {
      // La celda lleva el apóstrofo delante y va entrecomillada; las comillas
      // que trajera el propio texto salen duplicadas.
      const expected = `"'${p.replace(/"/g, '""')}"`;
      expect(`neutraliza ${JSON.stringify(p.slice(0, 12))}`, body.includes(expected),
        `(esperado ${expected.slice(0, 40)})`);
    }
    expect("ninguna celda empieza por = sin escapar", !/(^|,)"?=/m.test(body));
  }

  // ── 2) Comas, comillas y saltos de línea no descolocan las columnas.
  {
    const car = createCar({ marca: "Seat", modelo: "Ibiza" });
    createExpense(car.id, "Otros", 20, "2026-02-20", 'Taller "Paco", S.L.\nsegunda línea');

    const { body } = await exportCsv(car.id);
    expect("las comillas internas se duplican", body.includes('""Paco""'));
    // Con el texto entrecomillado, el salto de línea vive DENTRO de la celda:
    // la cabecera + una fila lógica, aunque haya 3 líneas físicas.
    const logicalRows = body.split("\n").length;
    expect("el salto de línea queda dentro de la celda", logicalRows === 3, `(${logicalRows} líneas)`);
  }

  // ── 3) Los números siguen siendo números (nada de apóstrofos de más).
  {
    const car = createCar({ marca: "Ford", modelo: "Focus" });
    createExpense(car.id, "Carburante", 65.5, "2026-03-10", "Repostaje", "", 40, 120000, null);

    const { body } = await exportCsv(car.id);
    const row = body.split("\n")[1];
    expect("el importe sale sin comillas ni apóstrofo", row.includes(",65.50,"), `(${row})`);
    expect("los litros salen crudos", row.includes(",40,"), `(${row})`);
    expect("los km salen crudos", row.includes(",120000,"), `(${row})`);
  }

  // ── 4) El nombre del archivo no puede inyectar cabeceras.
  {
    const car = createCar({
      marca: 'Honda"\r\nSet-Cookie: robado=1',
      modelo: "Civic",
    });
    const { res } = await exportCsv(car.id);
    const cd = res.headers.get("content-disposition") ?? "";

    // Lo que convierte el texto en una cabecera nueva es el CRLF, no las
    // palabras: "Set-Cookie" puede quedarse dentro del nombre del archivo como
    // texto inofensivo mientras no haya salto de línea que lo despegue.
    expect("Content-Disposition no lleva CR ni LF", !/[\r\n]/.test(cd), `(${JSON.stringify(cd)})`);
    expect("el valor cabe en una sola línea de cabecera", cd.split(/\r?\n/).length === 1);
    expect("las comillas del nombre están neutralizadas",
      (cd.match(/"/g) || []).length === 2, `(${cd})`);
    expect("sigue siendo una descarga", cd.startsWith("attachment;"));
    expect("no se puede fisgar el CSV desde otra pestaña",
      res.headers.get("x-content-type-options") === "nosniff");
  }

  // ── 5) Un coche que no existe da 404, no un CSV vacío.
  {
    const { res } = await exportCsv(999999);
    expect("coche inexistente → 404", res.status === 404);
  }

  console.log(`\nExportación CSV: Passed ${pass} / ${pass + fail}`);
  if (fail) process.exit(1);
}

void main();
