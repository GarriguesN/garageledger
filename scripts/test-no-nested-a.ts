// Un <a> dentro de otro <a> es HTML inválido: React lo hidrata mal, el
// navegador reescribe el árbol por su cuenta y el enlace interior deja de
// funcionar. Además el lector de pantalla anuncia dos enlaces donde el
// usuario ve uno.
//
// Antes esta comprobación solo miraba VehicleCard.tsx, que fue donde apareció
// el bug. Con el rebuild casi cualquier tarjeta del mockup es pulsable
// (vehículos, mantenimientos, documentos, gastos), así que ahora se revisan
// TODOS los componentes: la próxima vez que alguien anide un Link no hará
// falta acordarse de añadir el archivo a una lista.

import * as fs from "fs";
import * as path from "path";

let pass = 0, fail = 0;
const fails: string[] = [];
function expect(label: string, cond: boolean, hint = "") {
  if (cond) pass++;
  else { fail++; fails.push(`${label} ${hint}`); }
}

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/** Profundidad máxima de <Link>/<a> abiertos a la vez.
 *
 *  No es un parser de JSX de verdad y no hace falta que lo sea: el caso que
 *  se persigue es un enlace que se abre y, antes de cerrarse, abre otro. Los
 *  que se autocierran (<Link ... />) no anidan nada. */
function maxNestingDepth(src: string): { depth: number; line: number } {
  let depth = 0, worst = 0, worstLine = 0;

  src.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (line.startsWith("//") || line.startsWith("*") || line.startsWith("/*")) return;

    const opens = line.match(/<(?:Link|a)(?=[\s>])/g)?.length ?? 0;
    const selfCloses = line.match(/<(?:Link|a)[^>]*\/>/g)?.length ?? 0;
    const closes = line.match(/<\/(?:Link|a)>/g)?.length ?? 0;

    depth += opens - selfCloses;
    if (depth > worst) { worst = depth; worstLine = i + 1; }
    depth -= closes;
    if (depth < 0) depth = 0; // fuera de sincronía: no seguir acumulando
  });

  return { depth: worst, line: worstLine };
}

console.log("\n=== Ningún <a>/<Link> anidado dentro de otro ===");
const files = walk(SRC);
for (const file of files) {
  const rel = path.relative(ROOT, file);
  const { depth, line } = maxNestingDepth(fs.readFileSync(file, "utf8"));
  expect(rel, depth <= 1, depth > 1 ? `→ anidamiento ${depth} cerca de la línea ${line}` : "");
}
console.log(`  Revisados ${files.length} componentes.`);

console.log(`\nSin enlaces anidados: Passed ${pass} / ${pass + fail}`);
if (fail > 0) {
  console.log("FALLOS:");
  fails.forEach((f) => console.log(" - " + f));
  process.exit(1);
}
console.log("✅ No hay enlaces anidados");
