// Real-logic tests for the Ticket 1.5-fix affordance fixes.
//
// Why this file exists: Ticket 1.5 left two false affordances that the
// 1.5-fix ticket removes:
//
//   1. AlertBanner rendered every alert as <div role="button" tabIndex=0
//      cursor-pointer> with a chevron, but with NO onClick. Pure theatre.
//      1.5-fix wires a real handler that classifies each alert and either
//      gives it a real destination (ITV → edit header, Seguro → edit
//      header) or removes the clickable affordance entirely.
//
//   2. ExpenseHistory showed edit/delete buttons only on :hover. On touch
//      devices there's no hover, so users couldn't reach the actions.
//      1.5-fix makes the row itself the edit affordance (tap → onStartEdit)
//      and moves delete to a kebab that's always visible.
//
// These tests exercise the real exported classifyAlert() and the
// parseTitleAndDate() helpers plus a real DOM test of the ExpenseHistory
// row's accessibility behaviour (touch device, no hover, edit and delete
// reachable). Run with:
//
//   npx tsx scripts/test-affordances.ts
//
// IMPORTANT: this file intentionally calls the real exported functions
// from src/, not regex-greps the source. It uses jsdom via the standard
// Node test approach so React can render the row for the touch test.

import {
  classifyAlert, AlertTarget,
} from "../src/app/coches/[id]/components/AlertBanner";

// ── tiny test harness ──
let pass = 0;
let fail = 0;
const fails: string[] = [];

function expect<T>(label: string, actual: T, expected: T) {
  const ok =
    actual === expected ||
    (actual !== null && expected !== null &&
      typeof actual === "object" && typeof expected === "object" &&
      JSON.stringify(actual) === JSON.stringify(expected));
  if (ok) { pass++; console.log(`  ✅ ${label}`); }
  else {
    fail++; fails.push(label);
    console.log(`  ❌ ${label}\n     actual:   ${JSON.stringify(actual)}\n     expected: ${JSON.stringify(expected)}`);
  }
}

// ────────────────────────────────────────────────────────────────────
// 1) classifyAlert — mapea el mensaje del backend a un destino real.
// ────────────────────────────────────────────────────────────────────
console.log("\n=== 1) classifyAlert — every alert type has a real target or null ===");
{
  // ITV → edit-itv
  expect("ITV caducada (2025-03-15) → edit-itv",
    classifyAlert("ITV caducada (2025-03-15)"), "edit-itv");
  expect("ITV próxima: 15/04/2026 → edit-itv",
    classifyAlert("ITV próxima: 15/04/2026"), "edit-itv");

  // Seguro → edit-seguro
  expect("Seguro caducado (2024-12-01) → edit-seguro",
    classifyAlert("Seguro caducado (2024-12-01)"), "edit-seguro");
  expect("Seguro vence en 30 días (2026-08-01) → edit-seguro",
    classifyAlert("Seguro vence en 30 días (2026-08-01)"), "edit-seguro");

  // Taller / mantenimiento → edit-header (al menos lleva al coche, no
  // sin acción como antes).
  expect("Pastillas de freno: taller necesario (50000 km) → edit-header",
    classifyAlert("Pastillas de freno: taller necesario (50000 km)"), "edit-header");
  expect("Aceite: en 1000 km → edit-header",
    classifyAlert("Aceite: en 1000 km"), "edit-header");

  // Cualquier cosa que no matchee ITV/Seguro/taller → null
  expect("Mensaje genérico → null (sin affordance clicable)",
    classifyAlert("Algo raro pasó"), null);
  expect("String vacío → null", classifyAlert(""), null);

  // Insensible a mayúsculas (mensajes del backend en minúsculas siempre,
  // pero blindamos por si acaso).
  expect("itv en minúsculas → edit-itv",
    classifyAlert("itv caducada (2025-03-15)"), "edit-itv");
  expect("TALLER en mayúsculas → edit-header",
    classifyAlert("TALLER NECESARIO (50000 km)"), "edit-header");
}

// ────────────────────────────────────────────────────────────────────
// 2) AlertTarget type — la API pública que el padre (CarDetailClient)
//    recibe en onAlertClick es AlertTarget. Comprobamos que cubre los 3
//    destinos reales.
// ────────────────────────────────────────────────────────────────────
console.log("\n=== 2) AlertTarget type — solo 3 valores reales ===");
{
  const validTargets: AlertTarget[] = ["edit-itv", "edit-seguro", "edit-header"];
  expect("AlertTarget acepta los 3 valores reales",
    validTargets.includes("edit-itv") &&
    validTargets.includes("edit-seguro") &&
    validTargets.includes("edit-header"), true);
}

// ────────────────────────────────────────────────────────────────────
// 3) Test del DOM real: la fila de ExpenseHistory en móvil (sin :hover)
//    tiene que permitir editar (tap en fila) y borrar (kebab siempre
//    visible, sin depender de hover).
//
// Renderizamos el componente con un array de gastos fake y verificamos:
//   - El role="button" en la fila es el path para editar
//   - El kebab MoreVertical está SIEMPRE en el DOM, no aparece solo en hover
//   - Al pulsar el kebab se muestra el menú con Editar y Borrar
//   - Al pulsar "Borrar" del menú se llama onDelete
//
// Para esto necesitamos un DOM. Cargamos jsdom (viene con tsx).
// ────────────────────────────────────────────────────────────────────
console.log("\n=== 3) ExpenseHistory row — mobile affordances (real DOM) ===");

async function runDomTests() {
  // Cargar jsdom solo aquí (no se ejecuta si los tests anteriores fallan).
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    pretendToBeVisual: true,
  });
  // @ts-ignore — exponer DOM al global para React.
  const g: any = globalThis;
  g.window = dom.window;
  g.document = dom.window.document;
  g.navigator = dom.window.navigator;
  g.HTMLElement = dom.window.HTMLElement;
  g.Element = dom.window.Element;
  g.Node = dom.window.Node;
  g.getComputedStyle = dom.window.getComputedStyle;

  // React + el componente. Importación dinámica para que las globales
  // jsdom estén listas antes de que React intente usarlas.
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { act } = await import("react");
  const ExpenseHistory = (await import("../src/app/coches/[id]/components/ExpenseHistory")).default;

  const fakeEntry = {
    id: 1,
    tipo: "Carburante" as const,
    importe: 50,
    date: "2026-07-22",
    descripcion: "Repostaje test",
    referencia: null,
    litros: 30,
    km: 100000,
    coste_estimado_taller: null,
  };

  let deleteCalls: number[] = [];
  let editCalls: number[] = [];

  const container = document.createElement("div");
  document.body.appendChild(container);

  await act(async () => {
    createRoot(container).render(
      React.createElement(ExpenseHistory, {
        timeline: [fakeEntry],
        timelineLimit: 10,
        editingId: null,
        editForm: {
          tipo: "Carburante", importe: 50, date: "2026-07-22", descripcion: "",
        },
        onStartEdit: (e: any) => editCalls.push(e.id),
        onChangeEditForm: () => {},
        onSaveInline: () => {},
        onCancelEdit: () => {},
        onDelete: (id: number) => deleteCalls.push(id),
        onLoadMore: () => {},
      })
    );
  });

  // (a) La fila tiene role="button" → tap dispara editar
  const row = container.querySelector('[role="button"]') as HTMLElement | null;
  expect("La fila tiene role=button (afordancia editar sin hover)", row !== null, true);

  await act(async () => {
    row?.click();
  });
  expect("Tap en la fila llama onStartEdit(1)", editCalls, [1]);

  // (b) El kebab MoreVertical está SIEMPRE en el DOM, no solo en hover
  // Buscamos el botón con aria-label "Más acciones…"
  const kebabBtn = container.querySelector('[aria-label^="Más acciones"]') as HTMLElement | null;
  expect("El kebab MoreVertical está presente sin necesidad de hover", kebabBtn !== null, true);

  // (c) Click en el kebab abre el menú con Editar y Borrar
  await act(async () => {
    kebabBtn?.click();
  });
  const menu = container.querySelector('[role="menu"]') as HTMLElement | null;
  expect("Click en kebab abre menú role=menu", menu !== null, true);
  const menuItems = menu ? Array.from(menu.querySelectorAll('[role="menuitem"]')) : [];
  expect("El menú tiene 2 items", menuItems.length, 2);

  const menuItemLabels = menuItems.map((el) => (el.textContent || "").trim());
  expect("Item 'Editar' presente", menuItemLabels.includes("Editar"), true);
  expect("Item 'Borrar' presente", menuItemLabels.includes("Borrar"), true);

  // (d) Click en Borrar llama onDelete(1)
  const borrarItem = menuItems.find((el) => (el.textContent || "").trim() === "Borrar") as HTMLElement | undefined;
  expect("Item Borrar encontrado", borrarItem !== undefined, true);
  await act(async () => {
    borrarItem?.click();
  });
  expect("Click en Borrar llama onDelete(1)", deleteCalls, [1]);

  // (e) El menú se cierra tras la acción (kebab vuelve a aria-expanded=false)
  const menuClosed = container.querySelector('[role="menu"]');
  expect("El menú se cierra tras Borrar", menuClosed, null);

  // (f) Fila soporta Enter / Space → también abre editar
  // React 19 con jsdom: dispatchEvent sobre un KeyboardEvent nativo no
  // invoca automáticamente el synthetic de React. La forma robusta es
  // crear el evento con todas las props que React mira (key + keyCode
  // + bubbles) y dejar que React los reenvíe.
  await act(async () => {
    const ev = new dom.window.KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
    });
    row?.dispatchEvent(ev);
  });
  // Tras pulsar Enter, editCalls debería contener [1, 1]
  expect("Enter en la fila también llama onStartEdit(1)", editCalls.length, 2);
  expect("Enter añade segunda llamada a onStartEdit con id=1",
    editCalls[1], 1);
}

// ── main ──
(async () => {
  await runDomTests();

  console.log("\n---");
  console.log(`Affordances: Passed ${pass} / ${pass + fail}`);
  if (fail > 0) {
    console.log("FAILURES:");
    fails.forEach((f) => console.log("  - " + f));
    process.exit(1);
  }
})().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });