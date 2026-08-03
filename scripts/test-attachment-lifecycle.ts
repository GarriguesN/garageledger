// audit:S-6 / B-8 — Ciclo de vida de los adjuntos: los archivos se van cuando
// se van sus filas, y una fila no puede apuntar a donde no debe.
//
// Se ejecuta contra los handlers reales y se mira el disco de verdad.

import { TEST_UPLOAD_DIR } from "./lib/test-db";  // primera línea: fija DB_PATH/UPLOAD_DIR

import fs from "fs";
import path from "path";

import { POST as attachmentsPOST, DELETE as attachmentsDELETE } from "../src/app/api/attachments/route";
import { POST as carsPOST, PUT as carsPUT } from "../src/app/api/cars/route";
import { createCar, deleteCar, getCar } from "../src/lib/db/cars";
import { createExpense } from "../src/lib/db/expenses";
import { getAttachments } from "../src/lib/db/attachments";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean, hint = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label} ${hint}`); }
}

// PNG mínimo válido (firma + IHDR): suficiente para pasar la validación.
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489",
  "hex",
);

async function upload(carId: number, opts: { expenseId?: number; name?: string } = {}) {
  const fd = new FormData();
  fd.append("car_id", String(carId));
  if (opts.expenseId !== undefined) fd.append("expense_id", String(opts.expenseId));
  fd.append("file", new Blob([PNG], { type: "image/png" }), opts.name ?? "ticket.png");
  const req = new Request("http://localhost/api/attachments", { method: "POST", body: fd });
  const res = await attachmentsPOST(req as never);
  return { res, body: await res.json() };
}

function fileExists(filename: string): boolean {
  return fs.existsSync(path.join(TEST_UPLOAD_DIR, filename));
}

async function main() {
  console.log("\n=== Ciclo de vida de los adjuntos ===");

  // ── 1) Borrar un adjunto borra su archivo.
  {
    const car = createCar({ marca: "Honda", modelo: "Civic" });
    const { body } = await upload(car.id);
    expect("el archivo se escribe al subirlo", fileExists(body.filename));

    const req = new Request(`http://localhost/api/attachments?id=${body.id}`, { method: "DELETE" });
    await attachmentsDELETE(req as never);

    expect("la fila desaparece", getAttachments(car.id).length === 0);
    expect("y el archivo también", !fileExists(body.filename),
      "(quedaba en disco: facturas y documentos que el usuario creía borrados)");
  }

  // ── 2) Borrar el coche se lleva los archivos de todos sus adjuntos.
  //    La cascada de la FK limpia las filas; el disco no lo sabe nadie.
  {
    const car = createCar({ marca: "Seat", modelo: "Ibiza" });
    const a = (await upload(car.id, { name: "ficha.png" })).body;
    const b = (await upload(car.id, { name: "seguro.png" })).body;
    expect("los dos archivos están en disco", fileExists(a.filename) && fileExists(b.filename));

    deleteCar(car.id);

    expect("el coche se borra", !getCar(car.id));
    expect("no queda ningún archivo huérfano",
      !fileExists(a.filename) && !fileExists(b.filename));
  }

  // ── 3) Un adjunto no puede colgarse del gasto de otro coche.
  {
    const uno = createCar({ marca: "Ford", modelo: "Focus" });
    const otro = createCar({ marca: "Opel", modelo: "Corsa" });
    const gastoDeOtro = createExpense(otro.id, "Otros", 10, "2026-01-10", "Gasto ajeno");

    const { res } = await upload(uno.id, { expenseId: gastoDeOtro.id });
    expect("subir a un gasto de otro coche → 400", res.status === 400);
    expect("y no deja rastro en el coche", getAttachments(uno.id).length === 0);

    // El caso legítimo sigue funcionando.
    const gastoPropio = createExpense(uno.id, "Otros", 10, "2026-01-10", "Gasto propio");
    const ok = await upload(uno.id, { expenseId: gastoPropio.id });
    expect("subir al gasto propio → 201", ok.res.status === 201);
    expect("queda enlazado al gasto correcto", ok.body.expense_id === gastoPropio.id);
  }

  // ── 3b) audit:S-7/S-8 — El archivo tiene que ser lo que dice ser, y su
  //    nombre en disco no puede colisionar con el de otro.
  {
    const car = createCar({ marca: "Renault", modelo: "Clio" });

    const fd = new FormData();
    fd.append("car_id", String(car.id));
    // Un HTML con todo bien puesto salvo el contenido: extensión .png y
    // Content-Type image/png. Pasa `validateUpload` porque son coherentes
    // entre sí; es la firma binaria la que lo caza.
    fd.append("file", new Blob([Buffer.from("<html><script>alert(1)</script>")], {
      type: "image/png",
    }), "inocente.png");
    const req = new Request("http://localhost/api/attachments", { method: "POST", body: fd });
    const res = await attachmentsPOST(req as never);

    expect("HTML disfrazado de PNG → 415", res.status === 415, `(${res.status})`);
    expect("y no llega a escribirse nada", getAttachments(car.id).length === 0);

    // Dos subidas del mismo archivo no pueden acabar en el mismo fichero.
    const a = (await upload(car.id, { name: "foto.png" })).body;
    const b = (await upload(car.id, { name: "foto.png" })).body;
    expect("dos subidas iguales generan nombres distintos", a.filename !== b.filename);
    expect("las dos siguen en disco", fileExists(a.filename) && fileExists(b.filename));
  }

  // ── 4) Un coche inexistente no acepta adjuntos.
  {
    const { res } = await upload(987654);
    expect("subir a un coche inexistente → 404", res.status === 404);
  }

  // ── 5) La foto del coche tiene que ser un adjunto suyo.
  {
    const mio = createCar({ marca: "Kia", modelo: "Ceed" });
    const ajeno = createCar({ marca: "Mazda", modelo: "3" });
    const fotoAjena = (await upload(ajeno.id, { name: "foto.png" })).body;
    const fotoMia = (await upload(mio.id, { name: "foto.png" })).body;

    const put = async (carId: number, fotoId: unknown) => {
      const req = new Request("http://localhost/api/cars", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: carId, foto_attachment_id: fotoId }),
      });
      return carsPUT(req as never);
    };

    expect("asignar la foto de otro coche → 400", (await put(mio.id, fotoAjena.id)).status === 400);
    expect("el coche no se queda con la foto ajena", getCar(mio.id)?.foto_attachment_id !== fotoAjena.id);
    expect("asignar un adjunto inexistente → 400", (await put(mio.id, 999999)).status === 400);

    expect("asignar la foto propia → 200", (await put(mio.id, fotoMia.id)).status === 200);
    expect("la foto propia queda guardada", getCar(mio.id)?.foto_attachment_id === fotoMia.id);
    expect("quitar la foto (null) sigue permitido", (await put(mio.id, null)).status === 200);
  }

  // ── 6) Al crear el coche no puede venir una foto: aún no existe para tenerla.
  {
    const req = new Request("http://localhost/api/cars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marca: "Audi", modelo: "A3", foto_attachment_id: 1 }),
    });
    const res = await carsPOST(req as never);
    expect("crear con foto_attachment_id → 400", res.status === 400);

    const limpio = new Request("http://localhost/api/cars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marca: "Audi", modelo: "A3" }),
    });
    expect("crear sin foto → 201", (await carsPOST(limpio as never)).status === 201);
  }

  console.log(`\nCiclo de vida de los adjuntos: Passed ${pass} / ${pass + fail}`);
  if (fail) process.exit(1);
}

void main();
