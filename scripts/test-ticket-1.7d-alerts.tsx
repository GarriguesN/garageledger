// Regression test for Ticket 1.7d: independent alerts must accumulate and
// AlertBanner must render every one of them.
// Run: npx tsx scripts/test-ticket-1.7d-alerts.ts

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "garageledger-alerts-"));
process.env.DB_PATH = path.join(tmp, "alerts.db");

let pass = 0;
let fail = 0;
function expect(label: string, condition: boolean) {
  if (condition) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

async function main() {
  const { getDb } = await import("../src/lib/db/core");
  const { getCarMetrics } = await import("../src/lib/db/metrics");
  const { default: AlertBanner } = await import("../src/app/coches/[id]/components/AlertBanner");
  const db = getDb();

  // Use an isolated car so the test does not depend on seed IDs or today's
  // exact date. All deadlines are known past dates.
  const carId = Number(db.prepare(`
    INSERT INTO cars
      (marca, modelo, ano, km_actuales, estado, fecha_ultima_itv, fecha_vencimiento_seguro)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run("Test", "Three alerts", 2009, 200000, "Al dia", "2020-01-15", "2020-02-15").lastInsertRowid);

  const taskId = Number(db.prepare(`
    INSERT INTO maintenance_tasks
      (car_id, part_name, current_km, next_km, interval_km, completed)
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(carId, "Aceite vencido", 180000, 190000, 10000).lastInsertRowid);

  const metrics = getCarMetrics(carId);
  const messages = metrics.alerts.map((alert) => alert.message);

  console.log("\n=== metrics.alerts ===");
  console.log(metrics.alerts);
  expect("contiene exactamente tres alertas simultáneas", metrics.alerts.length === 3);
  expect("contiene alerta de mantenimiento con task_id", metrics.alerts.some((a) => a.task_id === taskId && a.message.includes("taller necesario")));
  expect("contiene ITV caducada", messages.some((m) => m.includes("ITV caducada")));
  expect("contiene seguro caducado", messages.some((m) => m.includes("Seguro caducado")));
  expect("las tres conservan severidad critical", metrics.alerts.every((a) => a.type === "critical"));

  const html = renderToStaticMarkup(<AlertBanner metrics={metrics} />);
  console.log("\n=== AlertBanner SSR ===");
  console.log(html);
  expect("renderiza mantenimiento", html.includes("Aceite vencido"));
  expect("renderiza ITV", html.includes("ITV caducada"));
  expect("renderiza seguro", html.includes("Seguro caducado"));
  expect("renderiza tres banners role=status", (html.match(/role="status"/g) ?? []).length === 3);

  console.log(`\nAlerts 1.7d: Passed ${pass} / ${pass + fail}`);
  if (fail) process.exitCode = 1;
}

main().finally(() => fs.rmSync(tmp, { recursive: true, force: true }));
