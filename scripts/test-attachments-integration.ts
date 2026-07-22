// Integration test: ejecuta los handlers POST/GET reales con BD sqlite en memoria
// y UPLOAD_DIR temporal. Sin servidor, sin red, sin PIN — solo código real del handler.

import fs from "fs";
import path from "path";
import os from "os";

const TMP_DB   = path.join(os.tmpdir(), `garage-test-${Date.now()}.db`);
const TMP_UPL  = path.join(os.tmpdir(), `garage-uploads-${Date.now()}`);
process.env.DB_PATH    = TMP_DB;
process.env.UPLOAD_DIR = TMP_UPL;

// Imports DESPUÉS de fijar env (getDb() lee DB_PATH en su primera llamada).
import { POST as attachmentsPOST, GET as attachmentsGET } from "../src/app/api/attachments/route";
import { GET as attachmentGET }   from "../src/app/api/attachments/[id]/route";
import { getDb } from "../src/lib/db/core";

let pass = 0, fail = 0;
const failures: string[] = [];
function expect(label: string, cond: boolean, hint = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; failures.push(label); console.log(`  ❌ ${label} ${hint}`); }
}

// helpers
function makeForm(fields: Record<string, string | { name: string; type: string; size?: number; content: Buffer }>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === "string") fd.append(k, v);
    else {
      const blob = new Blob([v.content], { type: v.type });
      fd.append(k, blob, v.name);
    }
  }
  return fd;
}

async function callPOST(carId: number, file: { name: string; type: string; content: Buffer } | string) {
  const fields: any = { car_id: String(carId) };
  if (typeof file === "string") fields.file = file;
  else fields.file = { ...file, size: file.content.length };
  const fd = makeForm(fields);
  const req = new Request("http://localhost/api/attachments", { method: "POST", body: fd });
  return attachmentsPOST(req as any);
}

async function main() {
console.log("\n=== SetUp: insertar coche de prueba ===");
{
  const db = getDb();
  db.prepare("INSERT INTO cars (marca, modelo) VALUES (?, ?)").run("TestMarca", "TestModelo");
  const c = db.prepare("SELECT id FROM cars ORDER BY id DESC LIMIT 1").get() as { id: number };
  console.log("  coche id:", c.id);
  console.log("  DB_PATH:", TMP_DB, "exists?", fs.existsSync(TMP_DB));
}

const CAR_ID = (getDb().prepare("SELECT id FROM cars ORDER BY id DESC LIMIT 1").get() as any).id;

console.log("\n=== 1) POST válido: PNG pequeño, espera 201 ===");
let createdId = 0;
{
  const png = Buffer.from([
    0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,   // PNG magic
    0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52,   // IHDR
    0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,   // 1x1
    0x08,0x06,0x00,0x00,0x00,0x1F,0x15,0xC4,
    0x89,0x00,0x00,0x00,0x0D,0x49,0x44,0x41,0x54,
    0x78,0x9C,0x63,0x00,0x01,0x00,0x00,0x05,
    0x00,0x01,0x0D,0x0A,0x2D,0xB4,0x00,0x00,
    0x00,0x00,0x49,0x45,0x4E,0x44,0xAE,0x42,0x60,0x82
  ]);
  const res = await callPOST(CAR_ID, { name: "foto.png", type: "image/png", content: png });
  expect(`status 201, got ${res.status}`, res.status === 201, JSON.stringify({ status: res.status }));
  const body = await res.json();
  createdId = body.id;
  console.log("     body:", JSON.stringify(body));
  expect(`tiene id numérico`, Number.isFinite(createdId));
  expect(`mime guardado = image/png`, body.mime_type === "image/png");
  expect(`filename guardado existe en disco`,
    body.filename && fs.existsSync(path.join(TMP_UPL, body.filename)));
}

console.log("\n=== 2) POST rechazado: texto/html ===");
{
  const res = await callPOST(CAR_ID, { name: "evil.html", type: "text/html", content: Buffer.from("<script>alert(1)</script>") });
  expect(`status 415, got ${res.status}`, res.status === 415);
}

console.log("\n=== 3) POST rechazado: 11MB (excede límite) ===");
{
  // 11MB de zeros; usamos un buffer real, no virtual
  const big = Buffer.alloc(11 * 1024 * 1024, 0xAA);
  const res = await callPOST(CAR_ID, { name: "big.png", type: "image/png", content: big });
  expect(`status 413, got ${res.status}`, res.status === 413);
}

console.log("\n=== 4) POST rechazado: MIME laundering (.png + .html renombrado) ===");
{
  const res = await callPOST(CAR_ID, { name: "foto.png", type: "text/html", content: Buffer.from("<script>alert(1)</script>") });
  expect(`status 415, got ${res.status}`, res.status === 415);
}

console.log("\n=== 5) POST rechazado: extensión no permitida (.exe) ===");
{
  const res = await callPOST(CAR_ID, { name: "trojan.exe", type: "application/pdf", content: Buffer.from("MZ") });
  expect(`status 415, got ${res.status}`, res.status === 415);
}

console.log("\n=== 6) GET /[id] del attachment válido: headers correctos ===");
{
  const req = new Request(`http://localhost/api/attachments/${createdId}`);
  const res: any = await (attachmentGET as any)(req, { params: Promise.resolve({ id: String(createdId) }) });
  expect(`status 200, got ${res?.status ?? "?"}`, res?.status === 200);
  expect("Content-Type correcto", res.headers.get("Content-Type") === "image/png");
  expect("X-Content-Type-Options: nosniff", res.headers.get("X-Content-Type-Options") === "nosniff");
  const cd = res.headers.get("Content-Disposition") ?? "";
  expect("Content-Disposition con 'attachment'", cd.startsWith("attachment;"));
  expect("Content-Disposition menciona filename=", cd.includes('filename='));
  expect("NO inline (no se renderiza en navegador)", !cd.includes("inline"));
  // el body debe tener bytes (consumir el stream)
  const buf = Buffer.from(await res.arrayBuffer());
  expect(`body tiene bytes (PNG magic 89 50 4E 47)`, buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47);
}

console.log("\n=== 7) GET /[id] con id inválido: 400 ===");
{
  const req = new Request(`http://localhost/api/attachments/abc`);
  const res: any = await (attachmentGET as any)(req, { params: Promise.resolve({ id: "abc" }) });
  expect(`status 400, got ${res?.status}`, res?.status === 400);
}

console.log("\n=== 8) GET /[id] con id inexistente: 404 ===");
{
  const req = new Request(`http://localhost/api/attachments/99999`);
  const res: any = await (attachmentGET as any)(req, { params: Promise.resolve({ id: "99999" }) });
  expect(`status 404, got ${res?.status}`, res?.status === 404);
}

console.log("\n---");
console.log(`Integration: Passed ${pass} / ${pass + fail}`);
if (fail > 0) {
  console.log("\nFALLOS:");
  failures.forEach(f => console.log(" - " + f));
  // limpia temporales antes de salir con error
  try { fs.rmSync(TMP_UPL, { recursive: true, force: true }); fs.rmSync(TMP_DB, { force: true }); } catch {}
  process.exit(1);
}

// Cleanup
try { fs.rmSync(TMP_UPL, { recursive: true, force: true }); fs.rmSync(TMP_DB, { force: true }); } catch {}
console.log("\n✅ Todo verde");
}

main().catch((e) => { console.error("CRASH:", e); process.exit(1); });
