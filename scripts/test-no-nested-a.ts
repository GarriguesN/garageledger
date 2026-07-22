// Static check: ensure VehicleCard.tsx doesn't have nested <a>.
// React explicitly forbids <a> inside <a>; this would surface as a hydration
// error in the browser. We catch the bug class loudly here before any push.

import * as fs from "fs";
import * as path from "path";

let pass = 0, fail = 0;
const fails: string[] = [];
function expect(label: string, cond: boolean, hint = "") {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; fails.push(label); console.log(`  ❌ ${label} ${hint}`); }
}

const file = path.resolve(__dirname, "../src/components/VehicleCard.tsx");
const src = fs.readFileSync(file, "utf8");

console.log("\n=== 1) VehicleCard root es <div>, no <Link> ===");
const usesDivAsRoot = /return\s*\(\s*\n?\s*<div\b/.test(src);
const notRootLink = !/return\s*\(\s*\n?\s*<Link\b/.test(src);
expect("root element es <div>, no <Link>", usesDivAsRoot && notRootLink);

console.log("\n=== 2) Hay <Link> dentro del kebab dropdown ===");
const linkCount = (src.match(/<Link\b/g) || []).length;
expect(`al menos 2 <Link> (got ${linkCount})`, linkCount >= 2);

console.log("\n=== 3) Manejo de click + a11y en lugar de <a> ===");
expect("onClick navega con router.push", /router\.push\(/.test(src));
expect("role + tabIndex para a11y", /role="link"/.test(src) && /tabIndex=\{0\}/.test(src));
expect("Enter / Space navega", /Enter|" "/.test(src));

console.log("\n=== 4) Sanity: ningún <Link> envuelve otros <Link> (caso real del bug) ===");
// El kebab usa <a download> literal para Exportar (legítimo, no <Link>).
// El bug que estamos cazando sería <Link> anidado en <Link>.
const linkBlocks = src.match(/<Link\b[^>]*>[\s\S]*?<\/Link>/g) || [];
let nestedLinkCount = 0;
for (const block of linkBlocks) {
  const innerLinks = (block.match(/<Link\b/g) || []).length - 1;
  if (innerLinks > 0) nestedLinkCount++;
}
expect(`0 <Link> dentro de otros <Link> (got ${nestedLinkCount})`, nestedLinkCount === 0);

console.log("\n---");
console.log(`Static check: Passed ${pass} / ${pass + fail}`);
if (fail > 0) { console.log("FALLOS:"); fails.forEach(f => console.log(" - " + f)); process.exit(1); }
console.log("\n✅ Sin <a> anidados");
