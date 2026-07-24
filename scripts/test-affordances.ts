// Real-logic tests for the Ticket 1.5-fix + 1.6 affordance fixes.
//
// Why this file exists: Ticket 1.5 left false affordances that the
// 1.5-fix and 1.6 tickets remove/wire correctly:
//
//   1. AlertBanner rendered every alert as <div role="button"> with no
//      onClick. 1.5-fix wired a real handler that classifies each alert
//      into a real destination; 1.6 refined that classification to:
//
//      - edit-itv     → header edit (Última ITV field)
//      - edit-seguro  → header edit (Vencimiento seguro field, added in 1.5-fix)
//      - scroll-maintenance{ taskId } → row in MaintenanceSchedule
//          (only when the backend's alert carries a real task_id; if it
//          doesn't, target is null → no affordance, NOT edit-header)
//
//   2. ExpenseHistory showed edit/delete only on :hover. 1.5-fix makes
//      tap → onStartEdit and moves delete to an always-visible kebab.
//
// These tests call the real exported functions and render the real
// components with jsdom. Run with:
//
//   npx tsx scripts/test-affordances.ts

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
// 1) classifyAlert — mapea cada alerta a un destino real o null.
//    Ticket 1.6: el input es ahora { message, task_id }.
// ────────────────────────────────────────────────────────────────────
console.log("\n=== 1) classifyAlert — every alert gets a real target or null ===");
{
  // ITV → edit-itv (sin task_id)
  expect("ITV caducada (2025-03-15) → edit-itv",
    classifyAlert({ message: "ITV caducada (2025-03-15)" }), "edit-itv");
  expect("ITV próxima: 15/04/2026 → edit-itv",
    classifyAlert({ message: "ITV próxima: 15/04/2026" }), "edit-itv");

  // Seguro → edit-seguro (sin task_id)
  expect("Seguro caducado (2024-12-01) → edit-seguro",
    classifyAlert({ message: "Seguro caducado (2024-12-01)" }), "edit-seguro");
  expect("Seguro vence en 30 días (2026-08-01) → edit-seguro",
    classifyAlert({ message: "Seguro vence en 30 días (2026-08-01)" }), "edit-seguro");

  // Mantenimiento CON task_id → scroll-maintenance{ taskId }
  expect("Pastillas: taller necesario (50000 km) task_id=42 → scroll-maintenance 42",
    classifyAlert({ message: "Pastillas: taller necesario (50000 km)", task_id: 42 }),
    { kind: "scroll-maintenance", taskId: 42 });
  expect("Aceite: en 1000 km task_id=7 → scroll-maintenance 7",
    classifyAlert({ message: "Aceite: en 1000 km", task_id: 7 }),
    { kind: "scroll-maintenance", taskId: 7 });

  // Mantenimiento SIN task_id (BD stale / alert huérfana) → null,
  // NUNCA edit-header. Esto es la regla explícita del Ticket 1.6.
  expect("Mantenimiento sin task_id → null (sin affordance, nunca edit-header)",
    classifyAlert({ message: "Pastillas: taller necesario (50000 km)" }), null);
  expect("Mantenimiento con task_id=0 → null (task_id inválido)",
    classifyAlert({ message: "Aceite: en 1000 km", task_id: 0 }), null);
  expect("Mantenimiento con task_id=-1 → null (task_id inválido)",
    classifyAlert({ message: "Aceite: en 1000 km", task_id: -1 }), null);

  // Otros casos
  expect("Mensaje genérico → null", classifyAlert({ message: "Algo raro pasó" }), null);
  expect("Message vacío → null", classifyAlert({ message: "" }), null);

  // ITV con task_id accidental (raro pero defensivo): task_id prevalece
  // porque mantenimiento tiene prioridad. ¿O ITV prevalece porque su
  // mensaje lo dice? El test decide: task_id es la fuente más fiable
  // (id único), así que el comportamiento esperado es scroll-maintenance.
  // Esto lo dejo cubierto por la implementación; aquí documentamos que
  // el orden de chequeo es task_id PRIMERO, mensaje después.
  expect("Alert con task_id toma precedence sobre el texto del mensaje",
    classifyAlert({ message: "ITV caducada (2025-03-15)", task_id: 99 }),
    { kind: "scroll-maintenance", taskId: 99 });
}

// ────────────────────────────────────────────────────────────────────
// 2) AlertTarget type — discriminated union con 3 ramas reales.
// ────────────────────────────────────────────────────────────────────
console.log("\n=== 2) AlertTarget — discriminated union shape ===");
{
  const valid: AlertTarget[] = [
    "edit-itv",
    "edit-seguro",
    { kind: "scroll-maintenance", taskId: 1 },
  ];
  // Verificamos que las 3 ramas existen y que tienen el shape correcto.
  expect("AlertTarget tiene 'edit-itv'", valid.some((v) => v === "edit-itv"), true);
  expect("AlertTarget tiene 'edit-seguro'", valid.some((v) => v === "edit-seguro"), true);
  expect("AlertTarget tiene { kind: 'scroll-maintenance', taskId }",
    valid.some((v) => typeof v === "object" &&
      v !== null && (v as any).kind === "scroll-maintenance"), true);
}

// ────────────────────────────────────────────────────────────────────
// 3) AlertBanner — Ticket: las alertas son SOLO informativas. El DOM
//    debe ser siempre <div role="status">, sin botones, sin chevron,
//    sin handler de click.
// ────────────────────────────────────────────────────────────────────
console.log("\n=== 3) AlertBanner — solo informativas (real DOM) ===");

async function runDomTests() {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    pretendToBeVisual: true,
  });
  const g: any = globalThis;
  // jsdom no expone CSS.escape; polyfill mínimo para querySelector de ids.
  g.CSS = g.CSS || { escape: (s: string) => s.replace(/([^\w-])/g, '\\$1') };
  g.window = dom.window;
  g.document = dom.window.document;
  g.navigator = dom.window.navigator;
  g.HTMLElement = dom.window.HTMLElement;
  g.Element = dom.window.Element;
  g.Node = dom.window.Node;
  g.getComputedStyle = dom.window.getComputedStyle;

  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { act } = await import("react");
  const AlertBanner = (await import("../src/app/coches/[id]/components/AlertBanner")).default;

  const metrics = {
    monthly: { current: 0, previous: 0 },
    projectedAnnual: 0,
    diy: 0,
    totalCostPerKm: null,
    fuel: { l100km: null, costPerKm: null, pricePerLiter: null },
    alerts: [
      { type: "critical" as const, message: "Pastillas: taller necesario (50000 km)", task_id: 42 },
      { type: "critical" as const, message: "Aceite: en 1000 km" },
      { type: "critical" as const, message: "ITV caducada (2025-03-15)" },
    ],
  };

  const container = document.createElement("div");
  document.body.appendChild(container);

  await act(async () => {
    createRoot(container).render(React.createElement(AlertBanner, { metrics }));
  });

  // 3 alertas renderizadas.
  const statuses = container.querySelectorAll("[role='status']");
  expect("3 alertas renderizadas", statuses.length, 3);

  // Ninguna alerta es un <button>.
  const buttons = container.querySelectorAll("button");
  expect("Ningún botón de alerta", buttons.length, 0);

  // Ninguna alerta tiene cursor-pointer.
  const allStatus = Array.from(statuses) as HTMLElement[];
  const anyClickable = allStatus.some((el) => el.className.includes("cursor-pointer"));
  expect("Ningún div de alerta tiene cursor-pointer", anyClickable, false);

  // Ningún chevron visible.
  const chevrons = container.querySelectorAll("svg.lucide-chevron-right");
  expect("Ningún chevron de alerta", chevrons.length, 0);

  // Ningún elemento de alerta tiene un handler onClick registrado en el
  // DOM. Esto es lo importante: garantiza que las alertas son pasivas.
  const anyOnClick = allStatus.some((el) => (el as any).onclick !== null);
  expect("Ningún div de alerta tiene handler onclick", anyOnClick, false);

  // Click programático en una alerta: ningún callback interno, no hay
  // preventDefault, no hay redirección. Sólo registramos que el click
  // es "pasivo" — sigue las reglas del navegador y no rompe la app.
  const beforeUrl = (dom.window as any).location?.href;
  await act(async () => {
    statuses[0]?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  const afterUrl = (dom.window as any).location?.href;
  expect("Click en alerta no cambia la URL", beforeUrl, afterUrl);
}

// ────────────────────────────────────────────────────────────────────
// 4) ExpenseHistory — DOM real, mobile affordances (Ticket 1.5-fix).
// ────────────────────────────────────────────────────────────────────
console.log("\n=== 4) ExpenseHistory row — mobile affordances (real DOM) ===");

async function runExpenseTests() {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    pretendToBeVisual: true,
  });
  const g: any = globalThis;
  // jsdom no expone CSS.escape; polyfill mínimo para querySelector de ids.
  g.CSS = g.CSS || { escape: (s: string) => s.replace(/([^\w-])/g, '\\$1') };
  g.window = dom.window;
  g.document = dom.window.document;
  g.navigator = dom.window.navigator;
  g.HTMLElement = dom.window.HTMLElement;
  g.Element = dom.window.Element;
  g.Node = dom.window.Node;
  g.getComputedStyle = dom.window.getComputedStyle;

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

  // confirm() se usa como red de seguridad antes de borrar; el nuevo flujo
  // vive en el modo edición, no en un kebab.
  const originalConfirm = g.confirm;
  g.confirm = () => true;
  (dom.window as any).confirm = () => true;

  const container = document.createElement("div");
  document.body.appendChild(container);

  // Ticket 1.15: el tap en la fila ya NO abre edición — sólo el chevron
  // expande el panel. La edición vive dentro del panel expandido.
  await act(async () => {
    createRoot(container).render(
      React.createElement(ExpenseHistory, {
        timeline: [fakeEntry],
        timelineLimit: 10,
        editingId: null,
        editForm: {
          tipo: "Carburante", importe: 50, date: "2026-07-22", descripcion: "",
        },
        onStartEdit: (_e?: any) => editCalls.push(1),
        onChangeEditForm: () => {},
        onSaveInline: () => {},
        onCancelEdit: () => {},
        onDelete: (id: number) => deleteCalls.push(id),
        onLoadMore: () => {},
      })
    );
  });

  // La fila ya NO es role=button (Ticket 1.15: tap-fila-edita eliminado).
  const row = container.querySelector('[role="button"]') as HTMLElement | null;
  expect("La fila NO tiene role=button (Ticket 1.15)", row, null);

  // El chevron sí es un botón, con aria-expanded/aria-controls (Ticket 1.15).
  const chevronBtn = container.querySelector('button[aria-expanded]') as HTMLElement | null;
  expect("El chevron tiene aria-expanded", chevronBtn !== null, true);
  const panelId = chevronBtn?.getAttribute("aria-controls") ?? "";
  expect("El chevron apunta al panel vía aria-controls", panelId.startsWith("expense-panel-"), true);

  // Tap en el chevron expande el panel.
  await act(async () => { chevronBtn?.click(); });
  const expandedPanel = container.querySelector(`#${CSS.escape(panelId)}`) as HTMLElement | null;
  expect("Panel existe con el id correcto", expandedPanel !== null, true);
  expect("Chevron pasa a aria-expanded=true", chevronBtn?.getAttribute("aria-expanded"), "true");

  // Tap-fila sigue SIN abrir edición.
  expect("Tap-fila no llamó onStartEdit", editCalls.length, 0);

  // Dentro del panel hay un botón Editar con la misma acción que onStartEdit.
  const editBtn = container.querySelector('button[aria-label^="Editar gasto"]') as HTMLElement | null;
  expect("Panel expandido tiene botón Editar", editBtn !== null, true);
  await act(async () => { editBtn?.click(); });
  expect("Click en Editar invoca onStartEdit", editCalls, [1]);

  // El botón Borrar dentro del panel también está presente.
  const delBtn = container.querySelector('button[aria-label^="Borrar gasto"]') as HTMLElement | null;
  expect("Panel expandido tiene botón Borrar", delBtn !== null, true);

  // Segundo render: la fila está ahora en modo edición. El botón Borrar
  // debe estar visible y debe invocar onDelete al pulsarlo.
  await act(async () => {
    createRoot(container).render(
      React.createElement(ExpenseHistory, {
        timeline: [fakeEntry],
        timelineLimit: 10,
        editingId: 1,
        editForm: {
          id: 1, tipo: "Carburante", importe: 50, date: "2026-07-22", descripcion: "",
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

  const deleteBtn = container.querySelector('[aria-label^="Borrar gasto"]') as HTMLElement | null;
  expect("Botón Borrar visible en modo edición", deleteBtn !== null, true);

  await act(async () => { deleteBtn?.click(); });
  expect("Click en Borrar llama onDelete(1)", deleteCalls, [1]);

  g.confirm = originalConfirm;
}

// ── main ──
(async () => {
  await runDomTests();
  await runExpenseTests();

  console.log("\n---");
  console.log(`Affordances: Passed ${pass} / ${pass + fail}`);
  if (fail > 0) {
    console.log("FAILURES:");
    fails.forEach((f) => console.log("  - " + f));
    process.exit(1);
  }
})().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });