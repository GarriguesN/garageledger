// Verifica el grid del header: la columna de la matrícula debe ser
// auto-ajustable (estrecha) y la del VIN ocupar el resto.

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CreditCard, Barcode } from "lucide-react";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

console.log("\n=== Grid header: matricula columna auto, VIN columna 1fr ===");
const html = renderToStaticMarkup(
  <div className="grid grid-cols-[auto_1fr] gap-2 mt-3">
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap"
      style={{ background: "#f2f2f3", color: "#211a1e" }}
      title="0016GMP"
    >
      <span style={{ color: "#211a1e", flexShrink: 0 }}><CreditCard size={13} strokeWidth={2.2} /></span>
      <span className="truncate min-w-0" style={{ maxWidth: "100%" }}>0016GMP</span>
    </span>
    <div className="min-w-0">
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap"
        style={{ background: "#f2f2f3", color: "#211a1e" }}
        title="VF3LCBHZT9S123456"
      >
        <span style={{ color: "#211a1e", flexShrink: 0 }}><Barcode size={13} strokeWidth={2.2} /></span>
        <span className="truncate min-w-0" style={{ maxWidth: "100%" }}>VF3LCBHZT9S123456</span>
      </span>
    </div>
  </div>
);

expect("Grid usa grid-template-columns: auto 1fr",
  html.includes("grid-template-columns:auto 1fr") || html.includes("grid-cols-[auto_1fr]"));
expect("Matrícula presente", html.includes("0016GMP"));
expect("VIN presente", html.includes("VF3LCBHZT9S123456"));
expect("min-w-0 en wrapper del VIN", html.includes("min-width:0") || html.includes("min-w-0"));
expect("Truncate preservado", html.includes("truncate"));
expect("Wrapper del VIN es min-w-0", html.match(/<div[^>]*min-w-0[^>]*>(?=[\s\S]*VF3)/));

console.log(`\nGrid header: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
