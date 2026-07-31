// Runs every scripts/test-*.ts(x) file with tsx and reports a summary.
// Each test script already exits non-zero on failure (see individual files);
// this runner just aggregates them under a single `npm test`.

import { readdirSync } from "fs";
import { spawnSync } from "child_process";
import path from "path";

const scriptsDir = path.join(process.cwd(), "scripts");
const testFiles = readdirSync(scriptsDir)
  .filter((f) => /^test-.*\.tsx?$/.test(f))
  .sort();

let failed = 0;
for (const file of testFiles) {
  console.log(`\n▶ ${file}`);
  const result = spawnSync("npx", ["tsx", path.join("scripts", file)], {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  if (result.status !== 0) failed++;
}

console.log(`\n=== ${testFiles.length - failed} / ${testFiles.length} scripts passed ===`);
process.exit(failed > 0 ? 1 : 0);
