import assert from "node:assert";
import test from "node:test";
import { resolveCategory } from "./categories";

test("resolveCategory resolves direct valid tipoId", () => {
  const category = resolveCategory("carburante");
  assert.strictEqual(category.id, "carburante");
});

test("resolveCategory resolves legacy tipoId alias", () => {
  const category = resolveCategory("parking");
  assert.strictEqual(category.id, "peaje_parking");
});

test("resolveCategory maps tipoLabel when tipoId is missing or unknown", () => {
  const category1 = resolveCategory(null, "mantenimiento (taller)");
  assert.strictEqual(category1.id, "mantenimiento");

  const category2 = resolveCategory("desconocido", "tuning");
  assert.strictEqual(category2.id, "pieza");
});

test("resolveCategory maps tipoLabel case-insensitively and trimmed", () => {
  const category = resolveCategory(undefined, " MANTENIMIENTO (DIY) ");
  assert.strictEqual(category.id, "mantenimiento_diy");
});

test("resolveCategory returns FALLBACK ('otros') for unknown tipoId and unknown/null tipoLabel", () => {
  const category1 = resolveCategory("inventado");
  assert.strictEqual(category1.id, "otros");

  const category2 = resolveCategory(null, "algo random");
  assert.strictEqual(category2.id, "otros");

  const category3 = resolveCategory(null, null);
  assert.strictEqual(category3.id, "otros");
});

test("resolveCategory prefers tipoId over tipoLabel if both are valid", () => {
  const category = resolveCategory("carburante", "mantenimiento (taller)");
  assert.strictEqual(category.id, "carburante");
});

test("resolveCategory prefers tipoId alias over tipoLabel", () => {
  const category = resolveCategory("peajes", "carburante");
  assert.strictEqual(category.id, "peaje_parking");
});

test("resolveCategory matching unknown tipoId but known tipoLabel", () => {
  const category = resolveCategory("unknowntipo", "ITV");
  assert.strictEqual(category.id, "impuestos");
});
