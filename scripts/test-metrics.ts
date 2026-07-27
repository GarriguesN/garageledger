import { test, after, mock } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const testDbPath = path.join(process.cwd(), "test-garageledger.db");
process.env.DB_PATH = testDbPath;

test("getFuelConsumption with insufficient data", async (t) => {
  const { getFuelConsumption } = await import("../src/lib/db/metrics.js");
  const { getDb } = await import("../src/lib/db/core.js");

  const db = getDb();

  // Override db.prepare with a mock
  const originalPrepare = db.prepare.bind(db);

  const mockAll = mock.fn(() => []);
  const mockPrepare = mock.fn((sql) => {
    if (sql.includes("FROM expenses WHERE car_id=? AND tipo='Carburante'")) {
        return { all: mockAll };
    }
    return originalPrepare(sql);
  });

  db.prepare = mockPrepare;

  // 0 elements
  const result = getFuelConsumption(1);
  assert.deepStrictEqual(result, { l100km: null, costPerKm: null, pricePerLiter: null });

  // 1 element
  mockAll.mock.mockImplementationOnce(() => [{ date: "2024-01-01", importe: 50, litros: 30, km: 1000 }]);
  const result2 = getFuelConsumption(1);
  assert.deepStrictEqual(result2, { l100km: null, costPerKm: null, pricePerLiter: null });

  // Restore
  db.prepare = originalPrepare;
});

after(() => {
  try { fs.unlinkSync(testDbPath); } catch {}
  try { fs.unlinkSync(testDbPath + "-shm"); } catch {}
  try { fs.unlinkSync(testDbPath + "-wal"); } catch {}
});
