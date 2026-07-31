// Verifica el sistema compartido de wizards:
//
//   - AppProgressDots: barra con dots y X/Y, color primario en pasos
//     alcanzados.
//   - WizardLayout: fullscreen con header, progress, body, footer.
//   - WizardSummaryCard: card resumen con botón Editar.
//   - SuccessScreen: confetti CSS + check + 2 acciones.
//   - Wizard: controlador con validación por paso, focus al primer error,
//     y opcional SuccessScreen.

import { readFileSync } from "fs";
import { resolve } from "path";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

function read(rel: string) {
  return readFileSync(resolve(__dirname, "..", rel), "utf-8");
}

console.log("\n=== Wizard shared infra: progressbar + layout + summary + success ===");

// ── AppProgressDots ─────────────────────────────────────────────
const dots = read("src/components/ui/AppProgressDots.tsx");
expect("AppProgressDots exporta default", /export default function AppProgressDots/.test(dots));
expect("AppProgressDots usa colors.primary", /colors\.primary/.test(dots));
expect("AppProgressDots muestra 'X / Y'", /\{safeCurrent\} \/ \{safeTotal\}/.test(dots));
expect("AppProgressDots tiene role=progressbar", /role="progressbar"/.test(dots));
expect("AppProgressDots tiene aria-valuenow", /aria-valuenow/.test(dots));
expect("AppProgressDots respeta prefers-reduced-motion", /useReducedMotion/.test(dots));

// ── WizardLayout ────────────────────────────────────────────────
const layout = read("src/components/ui/WizardLayout.tsx");
expect("WizardLayout fullscreen con h-dvh", /h-dvh/.test(layout));
expect("WizardLayout tiene header sticky", /<header/.test(layout));
expect("WizardLayout tiene progress", /<AppProgressDots/.test(layout));
expect("WizardLayout tiene footer sticky", /<footer/.test(layout));
expect("WizardLayout tiene back/close", /onBack|onClose/.test(layout));
expect("WizardLayout usa AnimatePresence para el body", /AnimatePresence/.test(layout));

// ── WizardSummaryCard ──────────────────────────────────────────
const summary = read("src/components/ui/WizardSummaryCard.tsx");
expect("WizardSummaryCard exporta default", /export default function WizardSummaryCard/.test(summary));
expect("WizardSummaryCard tiene botón Editar", /onEdit/.test(summary) && /<button/.test(summary));
expect("WizardSummaryCard recibe items[]", /WizardSummaryItem/.test(summary));

// ── SuccessScreen ──────────────────────────────────────────────
const success = read("src/components/ui/SuccessScreen.tsx");
expect("SuccessScreen exporta default", /export default function SuccessScreen/.test(success));
expect("SuccessScreen tiene confetti con clase", /confetti-piece/.test(success));
expect("SuccessScreen respeta prefers-reduced-motion", /useReducedMotion/.test(success));
expect("SuccessScreen muestra '¡Perfecto!'", /¡Perfecto!/.test(success));
expect("SuccessScreen tiene acción primary", /primaryAction/.test(success));
expect("SuccessScreen tiene acción secondary opcional", /secondaryAction\?/.test(success));

// ── globals.css (keyframes confetti) ───────────────────────────
const css = read("src/app/globals.css");
expect("globals.css define @keyframes confetti-fall", /@keyframes confetti-fall/.test(css));
expect("globals.css define .confetti-piece", /\.confetti-piece\s*\{/.test(css));

// ── Wizard (controlador) ───────────────────────────────────────
const wizard = read("src/components/ui/Wizard.tsx");
expect("Wizard exporta default", /export default function Wizard/.test(wizard));
expect("Wizard maneja stepIndex", /stepIndex/.test(wizard));
expect("Wizard maneja errors", /setErrors/.test(wizard));
expect("Wizard valida por paso con validate", /step\.validate/.test(wizard));
expect("Wizard tiene focus al primer error", /focusFirstError|aria-invalid/.test(wizard));
expect("Wizard tiene footer con Cancelar/Atrás/Siguiente", /cancelLabel|backLabel/.test(wizard));
expect("Wizard muestra SuccessScreen sin layout", /success\?\.show/.test(wizard));
expect("Wizard acepta V extends object", /V extends object/.test(wizard));

// ── Exports ───────────────────────────────────────────────────
const index = read("src/components/ui/index.ts");
expect("Index exporta AppProgressDots", /AppProgressDots/.test(index));
expect("Index exporta WizardLayout", /WizardLayout/.test(index));
expect("Index exporta WizardSection", /WizardSection/.test(index));
expect("Index exporta WizardSummaryCard", /WizardSummaryCard/.test(index));
expect("Index exporta SuccessScreen", /SuccessScreen/.test(index));
expect("Index exporta Wizard", /export \{ default as Wizard \}/.test(index));

console.log(`\nWizard infra: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
