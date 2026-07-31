// Verifica el wizard de Añadir Documento (mockup 15-17, 3 pasos).
//
//   Paso 1: Tipo de documento (Seguro, Permiso, ITV, Ficha técnica, Garantía, Otro)
//   Paso 2: Documento y expiración (upload, fecha)
//   Paso 3: Recordatorio y resumen
//
// Cubre:
//   (1) 3 pasos
//   (2) Mantiene la lógica de escaneo (jscanify + opencv)
//   (3) SuccessScreen con "Ver documentos" y "Añadir otro"
//   (4) Sube el documento a POST /api/attachments

import { readFileSync } from "fs";
import { resolve } from "path";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

const path = resolve(__dirname, "../src/app/coches/[id]/components/DocumentWizard.tsx");
const src = readFileSync(path, "utf-8");

console.log("\n=== DocumentWizard — contrato del wizard ===");

expect("Existe DocumentWizard", src.length > 0);
expect("Importa Wizard genérico", /import \{[^}]*\bWizard\b/.test(src));

// Pasos
const stepIds = [...src.matchAll(/^\s*id:\s*"([^"]+)",/gm)].map((m) => m[1]);
const uniqueStepIds = Array.from(new Set(stepIds));
expect("Define 3 pasos", uniqueStepIds.length === 3);

// Títulos mockup
expect("'Tipo de documento'", src.includes("Tipo de documento"));
expect("'Documento y expiración'", src.includes("Documento y expiración"));
expect("'Recordatorio y resumen'", src.includes("Recordatorio y resumen"));

// 6 categorías del mockup
const hasCategory = (label: string) => src.includes(label);
expect("Tile 'Seguro'", hasCategory("Seguro"));
expect("Tile 'Permiso'", hasCategory("Permiso"));
expect("Tile 'ITV'", hasCategory("ITV"));
expect("Tile 'Ficha técnica'", hasCategory("Ficha técnica"));
expect("Tile 'Garantía'", hasCategory("Garantía"));
expect("Tile 'Otro'", hasCategory("Otro"));

// Lógica de escaneo
expect("jscanify dinámico", /import\("jscanify\/client"\)/.test(src));
expect("opencv-js dinámico", /import\("@techstark\/opencv-js"\)/.test(src));
expect("extractPaper", /extractPaper/.test(src));
expect("Estados choose/scanning/scanPreview/scanFailed/form", /"choose"/.test(src) && /"scanning"/.test(src) && /"scanPreview"/.test(src) && /"scanFailed"/.test(src));

// Upload
expect("input file accept image", /accept="image\//.test(src));
expect("input capture environment", /capture="environment"/.test(src));

// Éxito
expect("Botón 'Ver documentos'", src.includes("Ver documentos"));
expect("Botón 'Añadir otro'", src.includes("Añadir otro"));

// API
// DocumentWizard no llama a /api/attachments directamente: la subida vive
// en DocumentsClient y se inyecta via prop `onUpload`. Comprobamos que la
// prop se invoca con los campos esperados.
expect("Llama a onUpload (sube vía DocumentsClient)", /await onUpload\(/.test(src));
expect("Pasa documentType al callback", /documentType:/.test(src));
expect("Pasa validUntil al callback", /validUntil:/.test(src));

// Compatibilidad API
expect("Prop 'open'", /open:\s*boolean/.test(src));
expect("Prop 'presetType'", /presetType:\s*DocType/.test(src));
expect("Prop 'onUpload'", /onUpload:\s*\(/.test(src));

console.log(`\nDocumentWizard: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
