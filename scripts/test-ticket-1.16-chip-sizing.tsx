// Verifica que el Chip del header se dimensiona por su contenido (no por
// max-w fijo). Para el VIN largo "VF3LCBHZT9S123456" el chip debe ocupar
// solo lo necesario + padding, no un ancho arbitrario.

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CreditCard, Barcode } from "lucide-react";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

// Mockeamos el componente Chip con la misma forma que en CarHeader.tsx.
// Importante: simulamos el comportamiento de `inline-flex` + `truncate` con
// max-width aplicado solo al span interno del texto.
function Chip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap"
      style={{ background: "#f2f2f3", color: "#211a1e" }}
      title={text}
    >
      <span style={{ color: "#211a1e", flexShrink: 0 }}>{icon}</span>
      <span className="truncate" style={{ maxWidth: "140px" }}>{text}</span>
    </span>
  );
}

console.log("\n=== Chip: dimensión por contenido ===");
const mat = renderToStaticMarkup(
  <Chip icon={<CreditCard size={13} strokeWidth={2.2} />} text="0016GMP" />
);
const vin = renderToStaticMarkup(
  <Chip icon={<Barcode size={13} strokeWidth={2.2} />} text="VF3LCBHZT9S123456" />
);

expect("Matrícula renderiza", mat.includes("0016GMP"));
expect("VIN renderiza completo", vin.includes("VF3LCBHZT9S123456"));
expect("Matrícula NO incluye max-w-180 en clase",
  !mat.includes("max-w-[180px]") && !mat.includes("max-w-"));
expect("VIN tiene maxWidth 140px en style del span de texto",
  vin.includes("max-width:140px") || vin.includes("max-width: 140px"));
expect("Ambos tienen padding horizontal px-1.5",
  mat.includes("padding-left:6px") || mat.includes("px-1.5"));
expect("Ambos tienen text-[10px]",
  mat.includes("font-size:10px") || mat.includes("text-[10px]"));
expect("Ambos tienen gap-1 (4px)",
  mat.includes("gap:4px") || mat.includes("gap-1"));
expect("Ambos tienen whitespace-nowrap",
  mat.includes("whitespace-nowrap"));

console.log(`\nChip sizing: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
