import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMonthlySpend, getDiySavings, getFuelConsumption, getTotalCostPerKm, getTimeline, getMonthlyHistory, getCarMetrics } from '../src/lib/db/metrics';
import { getDb } from '../src/lib/db/core';

// Ensure we are using an in-memory database to avoid modifying real data
if (process.env.DB_PATH !== ':memory:') {
    console.error("CRITICAL: DB_PATH must be set to ':memory:' to run this test safely.");
    process.exit(1);
}

const db = getDb();

function setupMockDatabase() {
    // Clear and setup
    db.exec('DELETE FROM maintenance_tasks');
    db.exec('DELETE FROM attachments');
    db.exec('DELETE FROM car_notes');
    db.exec('DELETE FROM expenses');
    db.exec('DELETE FROM cars');
    db.exec("INSERT INTO cars (id, marca, modelo, km_actuales) VALUES (1, 'Test', 'Car', 10000)");
}

test('Metrics Module Tests', async (t) => {
    // Run setup before tests
    setupMockDatabase();

    await t.test('getMonthlySpend: Returns 0 for empty expenses', () => {
        const result = getMonthlySpend(1);
        assert.equal(result.current, 0);
        assert.equal(result.previous, 0);
    });

    await t.test('getMonthlySpend: Calculates correct current and previous spend', () => {
        const now = new Date();
        const currentYm = now.toISOString().slice(0, 7);
        const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevYm = prevDate.toISOString().slice(0, 7);

        db.prepare('INSERT INTO expenses (car_id, date, tipo, importe) VALUES (?, ?, ?, ?)').run(1, `${currentYm}-15`, 'Carburante', 50);
        db.prepare('INSERT INTO expenses (car_id, date, tipo, importe) VALUES (?, ?, ?, ?)').run(1, `${prevYm}-10`, 'Carburante', 60);

        const result = getMonthlySpend(1);
        assert.equal(result.current, 50);
        assert.equal(result.previous, 60);
    });

    await t.test('getDiySavings: Calculates savings correctly', () => {
        db.prepare('INSERT INTO expenses (car_id, date, tipo, importe, coste_estimado_taller) VALUES (?, ?, ?, ?, ?)').run(1, '2024-01-01', 'Mantenimiento (DIY)', 20, 100);

        const savings = getDiySavings(1);
        assert.equal(savings, 80);
    });

    await t.test('getFuelConsumption: Calculates l100km correctly', () => {
        db.prepare('INSERT INTO expenses (car_id, date, tipo, importe, litros, km) VALUES (?, ?, ?, ?, ?, ?)').run(1, '2024-01-01', 'Carburante', 50, 30, 9000);
        db.prepare('INSERT INTO expenses (car_id, date, tipo, importe, litros, km) VALUES (?, ?, ?, ?, ?, ?)').run(1, '2024-02-01', 'Carburante', 60, 40, 9500);

        const result = getFuelConsumption(1);
        // (30 liters / 500 km) * 100 = 6
        assert.equal(result.l100km, 6);
    });

    await t.test('getTotalCostPerKm: Calculates correct cost per km', () => {
        // Total expenses so far: 50 + 60 + 20 + 50 + 60 = 240
        // Km: 10000
        // Cost/km: 240 / 10000 = 0.024
        const total = getTotalCostPerKm(1);
        assert.equal(total, 0.024);
    });

    await t.test('getTimeline: Limits results correctly', () => {
        const timeline = getTimeline(1, 2);
        assert.equal(timeline.length, 2);
        assert.equal(timeline[0].entry_type, 'expense');
    });

    await t.test('getMonthlyHistory: Returns monthly aggregation', () => {
        const history = getMonthlyHistory(1, 12);
        assert.ok(history.length > 0);
    });

    await t.test('getCarMetrics: Adds critical alert for expired ITV', () => {
        db.exec("UPDATE cars SET fecha_ultima_itv = '2022-01-01', fecha_vencimiento_seguro = '2022-01-01' WHERE id = 1");
        const metrics = getCarMetrics(1);
        const hasAlert = metrics.alerts.some(a => a.type === 'critical' && a.message.includes('ITV caducada'));
        assert.ok(hasAlert);
    });

    // Clean up
    db.exec('DELETE FROM expenses');
    db.exec('DELETE FROM cars');
});
