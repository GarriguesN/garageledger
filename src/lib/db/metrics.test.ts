import fs from 'fs';
import path from 'path';

// Setup mock db path to intercept better-sqlite3 instantiation without failing
// We use :memory: so no files are left behind
process.env.DB_PATH = ':memory:';

import test from 'node:test';
import assert from 'node:assert';

test('metrics.ts test suite', async (t) => {
  // Dynamic import to ensure DB_PATH is respected when core evaluates DB_PATH
  const coreModule = await import('./core');
  const metricsModule = await import('./metrics');

  let mockDbRows: any[] = [];

  // Initialize real db (in-memory)
  const db = coreModule.getDb();

  // Override db.prepare on the actual instance to use mock rows
  const originalPrepare = db.prepare.bind(db);
  db.prepare = (query: string) => {
    return {
      all: (...args: any[]) => mockDbRows,
      run: (...args: any[]) => {},
      get: (...args: any[]) => {},
      iterate: (...args: any[]) => [],
      pluck: () => ({ get: () => {}, all: () => [] }),
      expand: () => ({ get: () => {}, all: () => [] }),
      raw: () => ({ get: () => {}, all: () => [] }),
      columns: () => [],
      bind: () => {},
      source: query,
      reader: true,
      safeIntegers: () => ({ get: () => {}, all: () => [] }),
      database: db,
      busy: false
    } as any;
  };

  // Test cases for computeCarEstado
  // In computeCarEstado, daysUntil uses "T12:00:00" string concat and Date.now().
  // Using explicit local date calculation to match its logic.
  const now = new Date();

  // A helper to generate dates that will definitely yield specific daysUntil values
  const fmtDateOffset = (days: number) => {
      // daysUntil logic: Math.ceil((new Date(dateStr + "T12:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      // So if we want daysUntil = `days`, we need:
      // new Date(dateStr + "T12:00:00").getTime() ~ Date.now() + days * 86400000
      const targetTime = Date.now() + (days * 1000 * 60 * 60 * 24);
      const d = new Date(targetTime);
      return d.toISOString().split('T')[0];
  };

  const computeCarEstado = metricsModule.computeCarEstado;

  await t.test('computeCarEstado', () => {
    // Case 1: No ITV -> "A revisar"
    mockDbRows = [];
    assert.strictEqual(
      computeCarEstado({ id: 1, fecha_ultima_itv: null }),
      "A revisar",
      "Should be 'A revisar' if no ITV"
    );

    // Case 2: ITV Expired (>30 days) -> "ITV Caducada"
    // daysItv must be < 0 and Math.abs(daysItv) > 30. e.g. days = -32
    const expiredItvDate = fmtDateOffset(-32);
    const futureDate = fmtDateOffset(90);
    assert.strictEqual(
      computeCarEstado({ id: 1, fecha_ultima_itv: expiredItvDate, fecha_vencimiento_seguro: futureDate, km_actuales: 1000 }),
      "ITV Caducada",
      "Should be 'ITV Caducada' if ITV is past and > 30 days"
    );

    // Case 3: Seguro Expired -> "Seguro Caducado"
    const pastSeguroDate = fmtDateOffset(-5);
    assert.strictEqual(
      computeCarEstado({ id: 1, fecha_ultima_itv: futureDate, fecha_vencimiento_seguro: pastSeguroDate, km_actuales: 1000 }),
      "Seguro Caducado",
      "Should be 'Seguro Caducado' if Seguro is past"
    );

    // Case 4: Task overdue -> "Taller necesario"
    mockDbRows = [{ next_km: 1000 }];
    assert.strictEqual(
      computeCarEstado({ id: 1, fecha_ultima_itv: futureDate, fecha_vencimiento_seguro: futureDate, km_actuales: 1001 }),
      "Taller necesario",
      "Should be 'Taller necesario' if a task is overdue"
    );

    // Case 5: Near task -> "A revisar"
    // 1000 * 0.15 = 150. Distance is 1100 - 1000 = 100, which is < 150.
    mockDbRows = [{ next_km: 1100, interval_km: 1000 }];
    assert.strictEqual(
      computeCarEstado({ id: 1, fecha_ultima_itv: futureDate, fecha_vencimiento_seguro: futureDate, km_actuales: 1000 }),
      "A revisar",
      "Should be 'A revisar' if a task is near"
    );

    // Case 6: Near ITV -> "A revisar"
    // daysItv must be < 60 and >= 0 (or < 0 but not > 30)
    const nearItvDate = fmtDateOffset(30);
    mockDbRows = [];
    assert.strictEqual(
      computeCarEstado({ id: 1, fecha_ultima_itv: nearItvDate, fecha_vencimiento_seguro: futureDate, km_actuales: 1000 }),
      "A revisar",
      "Should be 'A revisar' if ITV is near (<60 days)"
    );

    // Case 7: All good -> "Al dia"
    mockDbRows = [];
    assert.strictEqual(
      computeCarEstado({ id: 1, fecha_ultima_itv: futureDate, fecha_vencimiento_seguro: futureDate, km_actuales: 1000 }),
      "Al dia",
      "Should be 'Al dia' if everything is fine"
    );
  });

  t.after(() => {
      // Restore db.prepare
      db.prepare = originalPrepare;
      db.close();
  });
});
