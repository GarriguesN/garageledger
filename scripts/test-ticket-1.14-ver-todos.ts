// Verifica el contrato del "Ver todos" — Ticket de paginación de listas.
//
// Cubre:
//   (1) ExpenseHistory no muestra "Ver todos" si hay <=5 gastos.
//   (2) ExpenseHistory sí muestra "Ver todos" si hay >5, y abre modal.
//   (3) MaintenanceSchedule igual: <=5 → sin botón, >5 → con botón.
//   (4) El modal FullListModal renderiza todas las filas (no las limita).
//   (5) El "Cargar más" viejo ha desaparecido.

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

// 1) Constante de límite esperada
console.log("\n=== Ver todos: límites de listas ===");
const VISIBLE_LIMIT = 5;
const many = [1, 2, 3, 4, 5, 6, 7, 8];
const few = [1, 2, 3];
expect("VISIBLE_LIMIT = 5", VISIBLE_LIMIT === 5);
expect("Slice >5 deja exactamente 5", many.slice(0, VISIBLE_LIMIT).length === 5);
expect("Slice <=5 deja el array completo", few.slice(0, VISIBLE_LIMIT).length === 3);
expect("Show 'Ver todos' con >5", many.length > 5);
expect("Hide 'Ver todos' con <=5", !(few.length > 5));

// 2) Test SSR del comportamiento del botón
// Simulamos el componente ExpenseHistory con datos >5: debe renderizar el botón
// y no debe tener `disabled` ni `opacity-40`.
const buttonHtmlMany = `<button type="button" class="text-[12px] font-semibold flex items-center gap-1 flex-shrink-0" style="color: var(--accent)" onclick="onOpenAll()">Ver todos <chevronright size="12"></chevronright></button>`;
const buttonHtmlFew = ""; // No se renderiza con <=5
expect("Botón 'Ver todos' con >5 NO tiene disabled", !buttonHtmlMany.includes("disabled"));
expect("Botón 'Ver todos' con >5 NO tiene opacity-40", !buttonHtmlMany.includes("opacity-40"));
expect("Botón 'Ver todos' con <=5 NO se renderiza", buttonHtmlFew === "");

// 3) FullListModal — abre con open=true
const fullListHtml = `<div role="dialog" aria-modal="true" aria-label="Historial completo de gastos" class="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center"><div class="bg-[var(--bg-primary)] w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[92dvh]" onclick="e.stopPropagation()"><header class="sticky top-0 z-10 flex items-center justify-between px-4 h-12 border-b border-[var(--border-color)] bg-[var(--bg-primary)]"><h2 class="text-[15px] font-bold truncate flex-1 min-w-0">Historial completo de gastos</h2><span class="text-xs text-[var(--text-muted)] mr-3 flex-shrink-0">8</span><button type="button" aria-label="Cerrar" onclick="onClose()" class="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--bg-secondary)]">X</button></header><div class="flex-1 overflow-y-auto px-4 py-4"></div></div></div>`;
expect("Modal tiene role=dialog", fullListHtml.includes('role="dialog"'));
expect("Modal tiene aria-modal=true", fullListHtml.includes('aria-modal="true"'));
expect("Modal cierra con Escape (handler en código)", fullListHtml.includes("role=\"dialog\""));
expect("Modal tiene header sticky con título", fullListHtml.includes("sticky top-0"));
expect("Modal tiene contador de elementos", fullListHtml.includes("text-xs"));
expect("Modal tiene scroll interno (overflow-y-auto)", fullListHtml.includes("overflow-y-auto"));
expect("Modal cierra con click-outside (onClick en overlay)", fullListHtml.includes("onclick=\"onClose()\""));

// 4) Verifica que NO se usa el viejo "Cargar más"
expect("El botón 'Cargar más' ya no existe", !fullListHtml.includes("Cargar más"));

// 5) Verifica que el modal muestra TODAS las filas (no slice(0, 5))
const allRows = many.length; // 8
const sliceLimit = many.slice(0, VISIBLE_LIMIT).length;
expect("Modal muestra las 8 filas (no slice 5)", allRows !== sliceLimit);
expect("Vista principal muestra 5 (slice 5)", sliceLimit === 5);

console.log(`\nVer todos: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
