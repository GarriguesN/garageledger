// Standalone test runner — no test framework dependency.
// Runs validateUpload against every ticket edge case + the MIME-laundering vectors.

import {
  validateUpload,
  isAllowedMime,
  safeDownloadFilename,
  MAX_FILE_SIZE_BYTES,
} from "../src/lib/attachments";

let pass = 0, fail = 0;
const failures: string[] = [];

function eq(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; console.log(`  ✅ ${label}`); }
  else {
    fail++;
    failures.push(label);
    console.log(`  ❌ ${label}\n     got:  ${JSON.stringify(got)}\n     want: ${JSON.stringify(want)}`);
  }
}

console.log("\n=== 1) Whitelist MIME (esperado: 415 \"Tipo de archivo no permitido\") ===");
const mimeCases: Array<[string, string]> = [
  ["image/jpeg",     "ok"],
  ["image/png",      "ok"],
  ["image/webp",     "ok"],
  ["application/pdf","ok"],
  ["text/html",      "fail"],
  ["application/x-msdownload", "fail"],
  ["application/octet-stream",  "fail"],
  ["image/svg+xml",  "fail"],
  ["text/javascript","fail"],
  ["",               "fail"],
];
for (const [mime, expected] of mimeCases) {
  // nombre de archivo coherente con el mime (cuando permitido) para no entremezclar checks
  const fname =
    mime === "image/jpeg"     ? "x.jpg"  :
    mime === "image/png"      ? "x.png"  :
    mime === "image/webp"     ? "x.webp" :
    mime === "application/pdf"? "x.pdf"  :
    mime === "image/svg+xml"  ? "x.svg"  :
    mime ? "x.bin" : "x";
  const r = validateUpload({ name: fname, type: mime, size: 1024 });
  const isOk = r.ok;
  if (expected === "ok") eq(`whitelist permite ${mime || "(vacío)"}`, isOk, true);
  else                    eq(`whitelist rechaza ${mime || "(vacío)"}`, isOk, false);
}

console.log("\n=== 2) Tamaño (esperado: 413 \"El archivo supera el tamaño máximo de 10MB\") ===");
{
  const r = validateUpload({ name: "x.png", type: "image/png", size: MAX_FILE_SIZE_BYTES + 1 });
  eq("11MB rechazado", r.ok, false);
  if (!r.ok) eq("código 413", (r as any).status, 413);
}
{
  const r = validateUpload({ name: "x.png", type: "image/png", size: MAX_FILE_SIZE_BYTES });
  eq("10MB exacto permitido", r.ok, true);
}
{
  const r = validateUpload({ name: "x.png", type: "image/png", size: 0 });
  eq("0 bytes rechazado", r.ok, false);
}
{
  const r = validateUpload({ name: "x.png", type: "image/png", size: -5 as any });
  eq("tamaño negativo rechazado", r.ok, false);
}

console.log("\n=== 3) Coherencia extensión ↔ MIME (esperado: 415) ===");
const extCases: Array<[string, string, boolean]> = [
  ["foto.PNG",   "image/png",      true],
  ["foto.jpg",   "image/jpeg",     true],
  ["foto.JPEG",  "image/jpeg",     true],
  ["foto.webp",  "image/webp",     true],
  ["doc.pdf",    "application/pdf",true],
  // MIME laundering
  ["foto.png",   "image/jpeg",     false],
  ["foto.html",  "image/png",      false],
  ["foto.exe",   "application/pdf",false],
  ["foto.png",   "application/pdf",false],
  ["mim.html",   "text/html",      false],
  ["doc.pdf",    "image/png",      false],
  ["sinext",     "image/png",      false],
  ["FOTO.JpG",   "image/jpeg",     true],
];
for (const [name, mime, shouldPass] of extCases) {
  const r = validateUpload({ name, type: mime, size: 1024 });
  eq(`ext ${name} + mime ${mime}`, r.ok, shouldPass);
}

console.log("\n=== 4) isAllowedMime (defensa en profundidad en GET /[id]) ===");
eq("image/jpeg",     isAllowedMime("image/jpeg"), true);
eq("text/html",      isAllowedMime("text/html"), false);
eq("image/svg+xml",  isAllowedMime("image/svg+xml"), false);
eq("vacío",          isAllowedMime(""), false);
eq("application/pdf",isAllowedMime("application/pdf"), true);

console.log("\n=== 5) safeDownloadFilename — solo vectores de seguridad (NO la parte estética) ===");
// Solo verificamos que NO haya vectores explotables: CRLF, ", \  y que no devuelva vacío.
{
  const r = safeDownloadFilename('evil"x\r\nSet-Cookie: pwn');
  if (r.includes("\r") || r.includes("\n") || r.includes('"')) {
    fail++; failures.push("CRLF/quote vector"); console.log("  ❌ CRLF/quote vector preservado:", JSON.stringify(r));
  } else { pass++; console.log("  ✅ CRLF y comillas saneadas"); }
}
{
  const r = safeDownloadFilename("../../etc/passwd");
  if (!r.includes("/") && !r.includes("\\")) { pass++; console.log("  ✅ path traversal sin slashes"); }
  else { fail++; failures.push("path traversal preservado"); console.log("  ❌", r); }
}
{
  const r = safeDownloadFilename("");
  eq("vacío → fallback", r, "adjunto");
}
{
  const r = safeDownloadFilename(".hidden");
  eq(".hidden → fallback (no empieza con .)", r, "adjunto");
}
{
  const r = safeDownloadFilename("   ");
  eq("solo espacios → fallback", r, "adjunto");
}

console.log("\n---");
console.log(`Passed: ${pass}  Failed: ${fail}`);
if (fail > 0) {
  console.log("\nFALLOS:");
  for (const f of failures) console.log(" - " + f);
  process.exit(1);
}
