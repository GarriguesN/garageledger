// Aísla cada script de test en una BD desechable.
//
// IMPORTANTE: importar este módulo SIEMPRE en la primera línea del test, antes
// que cualquier cosa que arrastre `src/lib/db`.
//
// El motivo es sutil y ya ha costado caro. Los módulos ESM se evalúan en orden
// de import, y `src/lib/db/core.ts` congela `DB_PATH` en una constante al
// cargarse. Un `process.env.DB_PATH = ...` escrito en el cuerpo del test llega
// tarde: para cuando esa línea se ejecuta, los imports del fichero ya están
// evaluados y `core.ts` ya ha decidido que la BD es `data/garageledger.db`.
// El test parecía aislado, ponía la ruta temporal en una variable y escribía
// en la BD de desarrollo igualmente. Así se llenó `data/garageledger.db` de
// coches "TestMarca" y el cuentakilómetros del Civic acabó en 2.4 millones.
//
// Un módulo aparte sí funciona: su cuerpo se ejecuta al evaluarse el import,
// es decir antes de que se evalúe el siguiente import de la lista.
//
// La segunda red de seguridad está en `run-tests.ts`, que ya lanza cada script
// con su propio DB_PATH. Esta vale para cuando se ejecuta un test suelto.

import fs from "fs";
import os from "os";
import path from "path";

const PROJECT_DB = path.resolve(process.cwd(), "data", "garageledger.db");

function pointsAtProjectDb(p: string | undefined): boolean {
  return !!p && path.resolve(p) === PROJECT_DB;
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "garageledger-test-"));

// Si el runner ya dio una ruta temporal, se respeta. Si no hay ninguna —o si
// apunta a la BD del proyecto— se sustituye: un test nunca debe escribir ahí.
if (!process.env.DB_PATH || pointsAtProjectDb(process.env.DB_PATH)) {
  process.env.DB_PATH = path.join(root, "garageledger.db");
}
if (!process.env.UPLOAD_DIR) {
  process.env.UPLOAD_DIR = path.join(root, "uploads");
}
fs.mkdirSync(process.env.UPLOAD_DIR, { recursive: true });

export const TEST_DB_PATH = process.env.DB_PATH;
export const TEST_UPLOAD_DIR = process.env.UPLOAD_DIR;

/** El coche semilla sobre el que operan los tests (Honda Civic, id 1).
 *  `seedIfEmpty` lo crea en cuanto se abre una BD vacía, así que cada script
 *  arranca del mismo estado conocido en vez de heredar la deriva del anterior. */
export const SEED_CAR_ID = 1;

process.on("exit", () => {
  try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ }
});
