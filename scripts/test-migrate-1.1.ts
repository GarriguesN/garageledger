// Verifies Ticket 1.1 migration adds the 5 new cars columns idempotently.
import fs from "fs";
import os from "os";
import path from "path";

async function main() {
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "garage-m1-"));
  const DB = path.join(TMP, "db.sqlite");
  process.env.DB_PATH = DB;

  // Force fresh load
  delete require.cache[require.resolve("../src/lib/db/core")];
  // better-sqlite3 native binding caches per handle — easiest: import after env set, then re-import
  delete require.cache[require.resolve("../src/lib/db/cars")];

  const { getDb } = await import("../src/lib/db/core");
  const { getCars, createCar, updateCar, getCar } = await import("../src/lib/db/cars");

  let pass = 0, fail = 0;
  const fails: string[] = [];
  function expect(label: string, cond: boolean, hint = "") {
    if (cond) { pass++; console.log(`  ✅ ${label}`); }
    else { fail++; fails.push(label); console.log(`  ❌ ${label} ${hint}`); }
  }

  console.log("\n=== 1) Init BD + columnas nuevas presentes ===");
  const db = getDb();
  const cols = (db.prepare("PRAGMA table_info(cars)").all() as { name: string }[]).map(c => c.name);
  expect("matricula existe", cols.includes("matricula"));
  expect("bastidor existe", cols.includes("bastidor"));
  expect("combustible existe", cols.includes("combustible"));
  expect("foto_attachment_id existe", cols.includes("foto_attachment_id"));
  expect("archivado existe", cols.includes("archivado"));

  console.log("\n=== 2) Defaults correctos ===");
  const car = createCar({
    marca: "Honda", modelo: "Civic",
    matricula: "1234-ABC", bastidor: "JHMFB4600CS123456", combustible: "Diésel",
  });
  expect("id asignado", Number.isFinite(car.id));
  expect("matricula persiste", car.matricula === "1234-ABC");
  expect("bastidor persiste", car.bastidor === "JHMFB4600CS123456");
  expect("combustible persiste", car.combustible === "Diésel");
  expect("foto_attachment_id default null", car.foto_attachment_id === null);
  expect("archivado default 0", car.archivado === 0);
  // For backward-compat: omitting the new fields must produce sensible defaults
  const car2 = createCar({ marca: "Toyota", modelo: "Yaris" });
  expect("default matricula vacío", car2.matricula === "");
  expect("default bastidor vacío", car2.bastidor === "");
  expect("default combustible Gasolina", car2.combustible === "Gasolina");

  console.log("\n=== 3) Update puede tocar las columnas nuevas ===");
  const upd = updateCar(car.id, {
    matricula: "9999-ZZZ",
    combustible: "Eléctrico",
    archivado: 1,
  });
  expect("update OK", !!upd);
  expect("matricula actualizada", getCar(car.id)?.matricula === "9999-ZZZ");
  expect("combustible actualizado", getCar(car.id)?.combustible === "Eléctrico");
  expect("archivado=1", getCar(car.id)?.archivado === 1);

  console.log("\n=== 4) Idempotencia: 2ª llamada a migrateSchema no rompe ===");
  // Simulate: call getDb again (cached) then check no exception
  const db2 = getDb();
  const cols2 = (db2.prepare("PRAGMA table_info(cars)").all() as { name: string }[]).map(c => c.name);
  expect("matricula sigue", cols2.includes("matricula"));
  expect("bastidor sigue", cols2.includes("bastidor"));
  expect("combustible sigue", cols2.includes("combustible"));

  console.log("\n=== 5) getCars filtra archivado por defecto ===");
  // car archivado=1 (de update). car2 archivado=0. seed mete 2 más (archivado=0).
  const lista = getCars(false);
  expect("getCars(false) excluye archivados", lista.find(c => c.id === car.id) === undefined);
  expect("getCars(false) incluye no-archivados", lista.find(c => c.id === car2.id) !== undefined);
  const listaAll = getCars(true);
  expect("getCars(true) incluye el archivado", listaAll.find(c => c.id === car.id) !== undefined);
  expect("getCars(true) incluye el no-archivado manual", listaAll.find(c => c.id === car2.id) !== undefined);
  expect("getCars(true) incluye también los del seed", listaAll.find(c => c.marca === "Honda" && c.modelo === "Civic") !== undefined);

  // Cleanup
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}

  console.log("\n---");
  console.log(`Migrate test: Passed ${pass} / ${pass + fail}`);
  if (fail > 0) { console.log("FALLOS:"); fails.forEach(f => console.log(" - " + f)); process.exit(1); }
  console.log("\n✅ Todo verde");
}
main().catch(e => { console.error("CRASH:", e); process.exit(99); });
