// Guardián del sistema de diseño. Comprueba tres cosas:
//
//   1. Sincronía  — cada token de src/design/tokens/*.ts está publicado en
//      globals.css con el mismo valor. Si alguien retoca un hex en el CSS y
//      se olvida del TS (o al revés), este test falla.
//   2. Cierre     — la escala tipográfica tiene exactamente 5 tamaños y 4
//      pesos, y hay exactamente 2 sombras. El sistema no puede crecer por
//      goteo.
//   3. Pureza     — ningún componente ya migrado usa colores hex, radios,
//      sombras o espaciados fuera de la rejilla. La lista LEGACY de abajo
//      son los archivos aún sin migrar: solo puede encoger.

import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";

import { colors } from "../src/design/tokens/colors";
import { radius } from "../src/design/tokens/radius";
import { shadows } from "../src/design/tokens/shadows";
import { fontSize, lineHeight, fontWeight } from "../src/design/tokens/typography";

const ROOT = process.cwd();
const CSS_PATH = path.join(ROOT, "src/app/globals.css");
const css = readFileSync(CSS_PATH, "utf8");

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
    failures++;
  }
}

/** Lee el valor de una custom property del bloque @theme. */
function cssVar(name: string): string | null {
  const m = css.match(new RegExp(`${name.replace(/[-]/g, "\\-")}\\s*:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
}

const norm = (v: string) => v.toLowerCase().replace(/\s+/g, " ").trim();

// ── 1. Sincronía TS ↔ CSS ────────────────────────────────────────────
console.log("\n1. Tokens TS ↔ globals.css");

const colorMap: Record<string, string> = {
  "--color-background": colors.background,
  "--color-surface": colors.surface,
  "--color-surface-elevated": colors.surfaceElevated,
  "--color-border": colors.border,
  "--color-primary": colors.primary,
  "--color-primary-hover": colors.primaryHover,
  "--color-green": colors.green,
  "--color-orange": colors.orange,
  "--color-blue": colors.blue,
  "--color-purple": colors.purple,
  "--color-cyan": colors.cyan,
  "--color-danger": colors.danger,
  "--color-text": colors.text,
  "--color-text-secondary": colors.textSecondary,
  "--color-text-muted": colors.textMuted,
};
for (const [v, expected] of Object.entries(colorMap)) {
  check(v, norm(cssVar(v) ?? "") === norm(expected), `CSS=${cssVar(v)} TS=${expected}`);
}

const radiusMap: Record<string, string> = {
  "--radius-card": radius.card,
  "--radius-button": radius.button,
  "--radius-input": radius.input,
  "--radius-image": radius.image,
  "--radius-chip": radius.chip,
  "--radius-pill": radius.pill,
};
for (const [v, expected] of Object.entries(radiusMap)) {
  check(v, norm(cssVar(v) ?? "") === norm(expected), `CSS=${cssVar(v)} TS=${expected}`);
}

for (const [v, expected] of Object.entries({
  "--shadow-card": shadows.card,
  "--shadow-floating": shadows.floating,
})) {
  check(v, norm(cssVar(v) ?? "") === norm(expected), `CSS=${cssVar(v)} TS=${expected}`);
}

for (const key of Object.keys(fontSize) as (keyof typeof fontSize)[]) {
  check(`--text-${key}`, norm(cssVar(`--text-${key}`) ?? "") === norm(fontSize[key]));
  check(
    `--text-${key}--line-height`,
    norm(cssVar(`--text-${key}--line-height`) ?? "") === norm(lineHeight[key]),
  );
}

// ── 2. El sistema está cerrado ───────────────────────────────────────
console.log("\n2. Escalas cerradas");
check("5 tamaños de texto", Object.keys(fontSize).length === 5, `hay ${Object.keys(fontSize).length}`);
check("5 interlineados", Object.keys(lineHeight).length === 5);
check("4 pesos", Object.keys(fontWeight).length === 4, `hay ${Object.keys(fontWeight).length}`);
check("2 sombras", Object.keys(shadows).length === 2, `hay ${Object.keys(shadows).length}`);
check("6 radios", Object.keys(radius).length === 6);

// ── 3. Pureza de los componentes migrados ────────────────────────────
// Lista de archivos exentos. Está VACÍA: la migración terminó y el gate
// cubre todo src/. Si alguien vuelve a añadir una línea aquí, que sea con
// una razón escrita al lado y fecha de caducidad.
const LEGACY = new Set<string>([
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|css)$/.test(entry)) out.push(full);
  }
  return out;
}

// Reglas de pureza. `globals.css` y src/design/ son la definición del
// sistema: son los únicos sitios donde un valor literal es legítimo.
const RULES: { name: string; re: RegExp; hint: string }[] = [
  {
    name: "color hexadecimal",
    re: /#[0-9a-fA-F]{3,8}\b/g,
    hint: "usa un token de colors.ts o una clase bg-*/text-*",
  },
  {
    name: "valor arbitrario de Tailwind",
    // rounded-[12px], shadow-[...], p-[13px], text-[11px], w-[52px]…
    re: /\b(?:rounded|shadow|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|w|h|text|leading|top|bottom|left|right|inset|size)-\[[^\]]+\]/g,
    hint: "usa la escala (rounded-card, p-4, text-body…)",
  },
  {
    name: "paso de espaciado fuera de la rejilla de 8",
    // p-5 (20px), gap-7 (28px), mt-9… La rejilla permite 1 2 3 4 6 8 10 12.
    re: /\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-(?:5|7|9|11|13|14|15|16|20|24)\b/g,
    hint: "la rejilla es 4 8 12 16 24 32 40 48 → clases 1 2 3 4 6 8 10 12",
  },
  {
    name: "rgba/rgb literal",
    re: /\brgba?\(\s*\d+\s*,/g,
    hint: "usa hexToRgba(token, alpha) o accentDim()",
  },
];

console.log("\n3. Pureza de los componentes migrados");
const scanned = walk(path.join(ROOT, "src"));
const violations: string[] = [];
let migratedCount = 0;

for (const file of scanned) {
  const rel = path.relative(ROOT, file);
  if (rel.startsWith("src/design/")) continue; // define el sistema
  if (rel === "src/app/globals.css") continue; // republica el sistema
  if (rel.startsWith("src/types/") || rel.startsWith("src/shims/")) continue;
  if (LEGACY.has(rel)) continue; // aún sin migrar
  migratedCount++;

  const src = readFileSync(file, "utf8");
  const code = src
    .split("\n")
    .map((l) => (/^\s*(\/\/|\*|\/\*)/.test(l) ? "" : l)) // ignora comentarios
    .join("\n");

  for (const rule of RULES) {
    const hits = code.match(rule.re);
    if (hits) {
      violations.push(`${rel}: ${rule.name} → ${[...new Set(hits)].slice(0, 4).join(", ")}  (${rule.hint})`);
    }
  }
}

check(`${migratedCount} archivos migrados sin valores sueltos`, violations.length === 0);
for (const v of violations) console.error(`      ${v}`);

console.log(`\n  Pendientes de migrar: ${LEGACY.size} archivos`);

if (failures > 0) {
  console.error(`\n✗ test-design-tokens: ${failures} fallo(s)\n`);
  process.exit(1);
}
console.log("\n✓ test-design-tokens: sistema de diseño coherente\n");

// ── 4. Contraste AA ──────────────────────────────────────────────────
// WCAG 2.1 AA: 4.5:1 para texto normal y 3:1 para texto grande (≥24px, o
// ≥18.66px en negrita) y para elementos de interfaz. Los acentos de color
// sobre superficie oscura son los candidatos a fallar, así que se comprueban
// todos en vez de confiar en el ojo.

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

console.log("\n4. Contraste AA");

/** [nombre, primer plano, fondo, mínimo] */
const PAIRS: [string, string, string, number][] = [
  ["texto sobre fondo",             colors.text,          colors.background,      4.5],
  ["texto sobre superficie",        colors.text,          colors.surface,         4.5],
  ["texto sobre superficie elevada", colors.text,         colors.surfaceElevated, 4.5],
  ["secundario sobre fondo",        colors.textSecondary, colors.background,      4.5],
  ["secundario sobre superficie",   colors.textSecondary, colors.surface,         4.5],
  // El texto atenuado solo se usa en metadatos, que son "texto normal": si no
  // llegara a 4.5 habría que aclararlo, no rebajar el listón.
  ["atenuado sobre fondo",          colors.textMuted,     colors.background,      4.5],
  ["atenuado sobre superficie",     colors.textMuted,     colors.surface,         4.5],
  ["atenuado sobre superficie elevada", colors.textMuted, colors.surfaceElevated, 4.5],
  // Los acentos se usan en cifras grandes y en badges, no en párrafos: el
  // umbral aplicable es el de texto grande / componente de interfaz (3:1).
  ["primario sobre superficie",     colors.primary,       colors.surface,         3],
  ["verde sobre superficie",        colors.green,         colors.surface,         3],
  ["naranja sobre superficie",      colors.orange,        colors.surface,         3],
  ["azul sobre superficie",         colors.blue,          colors.surface,         3],
  ["morado sobre superficie",       colors.purple,        colors.surface,         3],
  ["cian sobre superficie",         colors.cyan,          colors.surface,         3],
  ["peligro sobre superficie",      colors.danger,        colors.surface,         3],
  ["blanco sobre primario",         colors.textOnColor,   colors.primary,         3],
  ["borde sobre superficie",        colors.border,        colors.surface,         1.2],
];

for (const [name, fg, bg, min] of PAIRS) {
  const ratio = contrast(fg, bg);
  check(`${name}: ${ratio.toFixed(2)}:1 (mín ${min})`, ratio >= min);
}
