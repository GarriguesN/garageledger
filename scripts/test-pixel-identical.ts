// Sanity test del refactor: verifica que los subcomponentes del detalle
// se importan correctamente y que las funciones exportadas de format.tsx
// producen los mismos outputs que las inline del original.
//
// Esto NO renderiza el JSX (los subcomponentes no se pueden renderizar en
// Node porque usan hooks + icons), pero sí detecta:
//   - imports rotos
//   - regresiones en fmt/formatDate/formatLongMonthYear
//   - paridad de constantes (CATEGORIAS, TIPO_COLOR)

import * as path from "path";
import * as fs from "fs";

let pass = 0, fail = 0;
const fails: string[] = [];
function expect(label: string, cond: boolean, hint = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; fails.push(label); console.log(`  ❌ ${label} ${hint}`); }
}

async function main() {

console.log("\n=== 1) Imports de subcomponentes resuelven ===");
const baseDir = path.resolve(__dirname, "../src/app/coches/[id]");
const expectedFiles = [
  "CarHeader.tsx",
  "CarStatsGrid.tsx",
  "AlertBanner.tsx",
  "AddExpenseFormFields.tsx",
  "ProgramMaintenanceFormBody.tsx",
  "ExpenseHistory.tsx",
  "MaintenanceSchedule.tsx",
  "GloveBox.tsx",
];
for (const f of expectedFiles) {
  const p = path.join(baseDir, "components", f);
  expect(`${f} existe en components/`, fs.existsSync(p));
}
expect("lib/format.tsx existe", fs.existsSync(path.join(baseDir, "lib/format.tsx")));
expect("lib/types.ts existe", fs.existsSync(path.join(baseDir, "lib/types.ts")));

console.log("\n=== 2) page.tsx NO contiene los helpers que movimos ===");
const pageSrc = fs.readFileSync(path.join(baseDir, "page.tsx"), "utf8");
expect("page.tsx no contiene 'const CATEGORIAS = '", !/^const CATEGORIAS\s*=/m.test(pageSrc));
expect("page.tsx no contiene 'const TIPO_COLOR: Record'",
  !/^const TIPO_COLOR: Record/m.test(pageSrc));
expect("page.tsx no contiene 'function Sparkline'", !/function Sparkline\b/.test(pageSrc));
expect("page.tsx no contiene 'function fmt(n' inline", !/^function fmt\(n/m.test(pageSrc));
expect("page.tsx no contiene 'function formatDate'", !/^function formatDate\b/m.test(pageSrc));

console.log("\n=== 3) Helpers en format.tsx producen outputs esperados ===");
const fmtMod = await import("../src/app/coches/[id]/lib/format");
const { fmt, formatDate, formatLongMonthYear } = fmtMod;
expect("fmt(125.5) === '125,50'", fmt(125.5) === "125,50");
expect("fmt(0) === '0,00'", fmt(0) === "0,00");
expect("fmt(125) === '125,00'", fmt(125) === "125,00");
expect("formatDate('2026-07-15') === '15 jul'", formatDate("2026-07-15") === "15 jul");
expect("formatLongMonthYear('2026-02-15') === 'febrero de 2026'",
  formatLongMonthYear("2026-02-15") === "febrero de 2026");

console.log("\n=== 4) CATEGORIAS y TIPO_COLOR mantienen paridad con el código viejo ===");
const EXPECTED_CATEGORIAS = [
  "Carburante", "Mantenimiento (DIY)", "Mantenimiento (Taller)",
  "Tuning",
  "Seguro", "ITV", "Impuestos", "Parking", "Peajes", "Lavado", "Otros",
];
expect("CATEGORIAS idénticas", JSON.stringify(fmtMod.CATEGORIAS) === JSON.stringify(EXPECTED_CATEGORIAS));
const EXPECTED_TIPO_COLOR: Record<string, string> = {
  "Carburante": "#c3423f",
  "Mantenimiento (DIY)": "#4f9d69",
  "Mantenimiento (Taller)": "#d4956a",
  "Tuning": "#8b5cf6",
  "Seguro": "#3b82f6",
  "ITV": "#8b5cf6",
  "Impuestos": "#f59e0b",
  "Parking": "#6b7280",
  "Peajes": "#10b981",
  "Lavado": "#ec4899",
  "Otros": "#6b7280",
};
expect("TIPO_COLOR idénticas", JSON.stringify(fmtMod.TIPO_COLOR) === JSON.stringify(EXPECTED_TIPO_COLOR));

console.log("\n=== 5) isFuel / isDiy / isMaintenance funcionan igual ===");
expect("isFuel Carburante === true", fmtMod.isFuel({ tipo: "Carburante" }) === true);
expect("isFuel Seguro === false", fmtMod.isFuel({ tipo: "Seguro" }) === false);
expect("isDiy 'Mantenimiento (DIY)' === true", fmtMod.isDiy({ tipo: "Mantenimiento (DIY)" }) === true);
expect("isDiy 'Mantenimiento (Taller)' === true", fmtMod.isDiy({ tipo: "Mantenimiento (Taller)" }) === true);
expect("isDiy 'Carburante' === false", fmtMod.isDiy({ tipo: "Carburante" }) === false);
expect("isMaintenance 'Carburante' === true", fmtMod.isMaintenance({ tipo: "Carburante" }) === true);
expect("isMaintenance 'Mantenimiento (Taller)' === true", fmtMod.isMaintenance({ tipo: "Mantenimiento (Taller)" }) === true);

console.log("\n---");
console.log(`Refactor check: Passed ${pass} / ${pass + fail}`);
if (fail > 0) { console.log("FALLOS:"); fails.forEach(f => console.log(" - " + f)); process.exit(1); }
console.log("\n✅ Refactor preserva comportamiento");
}

main().catch((e) => { console.error("CRASH:", e); process.exit(99); });
