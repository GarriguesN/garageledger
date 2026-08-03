// Runs every scripts/test-*.ts(x) file with tsx and reports a summary.
// Each test script already exits non-zero on failure (see individual files);
// this runner just aggregates them under a single `npm test`.
//
// Cada script se lanza con su propio DB_PATH y UPLOAD_DIR dentro de un
// directorio temporal. Así ningún test puede escribir en
// `data/garageledger.db`, y dos scripts no se heredan el estado entre ellos.
// Los tests además importan `lib/test-db` en su primera línea, que cubre el
// caso de ejecutarlos sueltos con `npx tsx scripts/test-…`.

import { readdirSync, mkdtempSync, rmSync } from "fs";
import { spawnSync } from "child_process";
import os from "os";
import path from "path";

const scriptsDir = path.join(process.cwd(), "scripts");
const testFiles = readdirSync(scriptsDir)
  .filter((f) => /^test-.*\.tsx?$/.test(f))
  .sort();

const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "garageledger-suite-"));

let failed = 0;
for (const file of testFiles) {
  console.log(`\n▶ ${file}`);
  const sandbox = path.join(tmpRoot, file.replace(/\W+/g, "_"));
  const result = spawnSync("npx", ["tsx", path.join("scripts", file)], {
    stdio: "inherit",
    cwd: process.cwd(),
    env: {
      ...process.env,
      DB_PATH: path.join(sandbox, "garageledger.db"),
      UPLOAD_DIR: path.join(sandbox, "uploads"),
    },
  });
  if (result.status !== 0) failed++;
}

try { rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* best effort */ }

console.log(`\n=== ${testFiles.length - failed} / ${testFiles.length} scripts passed ===`);
process.exit(failed > 0 ? 1 : 0);
