// Integration test for scripts/backup.ts.
// Round-trip: create db → run backup → verify tar contents → restore → query → retention prune.

import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import Database from "better-sqlite3";

let pass = 0, fail = 0;
const fails: string[] = [];
function expect(label: string, cond: boolean, hint = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; failures(label); console.log(`  ❌ ${label} ${hint}`); }
}
function failures(label: string) { fails.push(label); }

function rmrf(p: string) { try { fs.rmSync(p, { recursive: true, force: true }); } catch {} }

async function main() {
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "garage-bkp-test-"));
  const DB_DIR = path.join(TMP, "data"); fs.mkdirSync(DB_DIR, { recursive: true });
  const UPLOAD_DIR = path.join(TMP, "uploads"); fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const BACKUP_DIR = path.join(TMP, "backups"); fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const DB_PATH = path.join(DB_DIR, "garageledger.db");
  process.env.DB_PATH = DB_PATH;
  process.env.UPLOAD_DIR = UPLOAD_DIR;
  process.env.BACKUP_DIR = BACKUP_DIR;
  process.env.BACKUP_RETENTION_DAYS = "30";

  console.log("\n=== SetUp: crear BD con datos ===");
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marca TEXT NOT NULL, modelo TEXT NOT NULL, notes TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      car_id INTEGER NOT NULL, amount_cents INTEGER NOT NULL
    );
  `);
  db.prepare("INSERT INTO cars (marca, modelo) VALUES (?,?)").run("Honda", "Civic");
  const carId = (db.prepare("SELECT id FROM cars ORDER BY id DESC LIMIT 1").get() as any).id;
  db.prepare("INSERT INTO expenses (car_id, amount_cents) VALUES (?,?)").run(carId, 4242);
  db.prepare("INSERT INTO cars (marca, modelo) VALUES (?,?)").run("Toyota", "Corolla");
  // Crear un archivo de upload asociado
  fs.writeFileSync(path.join(UPLOAD_DIR, "test-receipt.png"), Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  db.close(); // forzar el WAL → main db

  console.log("\n=== 1) Ejecutar backup ===");
  // Use the wrapper script (so we also exercise that path)
  const repoRoot = path.resolve(__dirname, "..");
  const out = execFileSync("bash", [path.join(repoRoot, "scripts/backup.sh")], {
    env: { ...process.env, DB_PATH, UPLOAD_DIR, BACKUP_DIR },
    encoding: "utf8",
    timeout: 60_000,
  });
  console.log("     script output:\n" + out.split("\n").map(l => "       " + l).join("\n"));

  expect("script reportó [backup] OK", /\[backup\] OK:/.test(out));
  expect("script tarball existe", fs.readdirSync(BACKUP_DIR).some(f => f.startsWith("garageledger-backup-") && f.endsWith(".tar.gz")));
  const tarball = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith("garageledger-backup-") && f.endsWith(".tar.gz"))[0];
  expect("solo un tar.gz", fs.readdirSync(BACKUP_DIR).length === 1);
  expect("tarball > 0 bytes", tarball && fs.statSync(path.join(BACKUP_DIR, tarball)).size > 0);

  console.log("\n=== 2) Inspeccionar contenido del tar.gz ===");
  const list = execFileSync("tar", ["tzf", path.join(BACKUP_DIR, tarball)], { encoding: "utf8" });
  console.log("     tarball contents:\n" + list.split("\n").filter(Boolean).map(l => "       " + l).join("\n"));
  expect("contiene db.sqlite", list.includes("db.sqlite"));
  expect("contiene uploads/test-receipt.png", list.includes("uploads/test-receipt.png"));

  console.log("\n=== 3) Round-trip: restaurar en una nueva BD ===");
  const extractDir = path.join(TMP, "extract");
  fs.mkdirSync(extractDir, { recursive: true });
  execFileSync("tar", ["xzf", path.join(BACKUP_DIR, tarball), "-C", extractDir]);
  expect("db.sqlite extraído", fs.existsSync(path.join(extractDir, "db.sqlite")));
  const restored = new Database(path.join(extractDir, "db.sqlite"), { readonly: true });
  const cars = restored.prepare("SELECT marca, modelo FROM cars ORDER BY id").all() as any[];
  expect("2 coches restaurados", cars.length === 2);
  expect("primer coche Honda Civic", cars[0]?.marca === "Honda" && cars[0]?.modelo === "Civic");
  expect("segundo coche Toyota Corolla", cars[1]?.marca === "Toyota" && cars[1]?.modelo === "Corolla");
  const expenses = restored.prepare("SELECT amount_cents FROM expenses").all() as any[];
  expect("gasto restaurado con monto correcto", expenses.length === 1 && expenses[0].amount_cents === 4242);
  expect("upload binario idéntico",
    fs.readFileSync(path.join(extractDir, "uploads/test-receipt.png")).equals(
      fs.readFileSync(path.join(UPLOAD_DIR, "test-receipt.png"))));
  restored.close();

  console.log("\n=== 4) Retention: backup viejo se borra ===");
  // Crear un tar.gz con mtime de hace 100 días
  const oldName = "garageledger-backup-2026-04-15_030000.tar.gz";
  const oldTar = path.join(BACKUP_DIR, oldName);
  fs.writeFileSync(oldTar, "fake old backup");
  const oldTime = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
  fs.utimesSync(oldTar, oldTime, oldTime);
  // Backup reciente que NO debe borrarse
  const recentName = "garageledger-backup-2026-07-21_030000.tar.gz";
  const recentTar = path.join(BACKUP_DIR, recentName);
  fs.writeFileSync(recentTar, "recent backup");
  // (mtime = ahora, por defecto)

  const out2 = execFileSync("bash", [path.join(repoRoot, "scripts/backup.sh")], {
    env: { ...process.env, DB_PATH, UPLOAD_DIR, BACKUP_DIR, BACKUP_RETENTION_DAYS: "30" },
    encoding: "utf8",
    timeout: 60_000,
  });
  console.log("     retention output:\n" + out2.split("\n").filter(l => l.includes("pruned") || l.includes("done") || l.includes("OK")).map(l => "       " + l).join("\n"));

  expect("backup viejo pruned", !fs.existsSync(oldTar));
  expect("backup reciente intacto", fs.existsSync(recentTar));
  // Después de retention: viejo removido + 1 reciente que ya existía + 1 nuevo de esta ejecución = 2 tarballs.
  expect("tarball nuevo creado", fs.readdirSync(BACKUP_DIR).length === 2);

  console.log("\n=== 5) DB miss → exit 3 ===");
  delete process.env.DB_PATH;
  try {
    execFileSync("bash", [path.join(repoRoot, "scripts/backup.sh")], {
      env: { ...process.env, DB_PATH: "/nonexistent/fake.db", UPLOAD_DIR, BACKUP_DIR },
      encoding: "utf8",
      timeout: 30_000,
    });
    expect("debería fallar con exit 3", false);
  } catch (e: any) {
    expect(`exit code 3 (got ${e.status})`, e.status === 3);
  }
  // restore for downstream tests
  process.env.DB_PATH = DB_PATH;

  console.log("\n=== Cleanup ===");
  rmrf(TMP);

  console.log("\n---");
  console.log(`Backup test: Passed ${pass} / ${pass + fail}`);
  if (fail > 0) {
    console.log("\nFALLOS:");
    for (const f of fails) console.log(" - " + f);
    process.exit(1);
  }
  console.log("\n✅ Todo verde");
}

main().catch(e => { console.error("CRASH:", e); process.exit(99); });
