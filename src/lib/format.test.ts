import test from "node:test";
import assert from "node:assert";
import { formatCurrency } from "./format";

test("formatCurrency", async (t) => {
  await t.test("returns '—' for null or undefined", () => {
    assert.strictEqual(formatCurrency(null), "—");
    assert.strictEqual(formatCurrency(undefined), "—");
  });

  await t.test("returns '—' for non-finite numbers", () => {
    assert.strictEqual(formatCurrency(NaN), "—");
    assert.strictEqual(formatCurrency(Infinity), "—");
    assert.strictEqual(formatCurrency(-Infinity), "—");
  });

  await t.test("formats zero correctly", () => {
    assert.strictEqual(formatCurrency(0), "0 €");
    assert.strictEqual(formatCurrency(-0), "-0 €");
  });

  await t.test("formats positive numbers with € symbol", () => {
    assert.strictEqual(formatCurrency(182), "182 €");
  });

  await t.test("rounds fractional numbers to nearest integer", () => {
    assert.strictEqual(formatCurrency(182.4), "182 €");
    assert.strictEqual(formatCurrency(182.5), "183 €");
    assert.strictEqual(formatCurrency(182.9), "183 €");
  });

  await t.test("formats thousands with es-ES locale separator (dot)", () => {
    assert.strictEqual(formatCurrency(1234), "1234 €");
    assert.strictEqual(formatCurrency(1234567), "1.234.567 €");
    assert.strictEqual(formatCurrency(1234.56), "1235 €");
  });

  await t.test("formats negative numbers", () => {
    assert.strictEqual(formatCurrency(-182), "-182 €");
    assert.strictEqual(formatCurrency(-12345), "-12.345 €");
  });
});
