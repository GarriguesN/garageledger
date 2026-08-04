import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { formatKm } from "./format";

describe("formatKm", () => {
  test("formats normal integers", () => {
    assert.equal(formatKm(132870), "132.870 km");
  });

  test("formats zero", () => {
    assert.equal(formatKm(0), "0 km");
  });

  test("rounds decimal numbers", () => {
    assert.equal(formatKm(150.5), "151 km");
    assert.equal(formatKm(150.4), "150 km");
  });

  test("formats negative numbers", () => {
    assert.equal(formatKm(-100), "-100 km");
    assert.equal(formatKm(-15000), "-15.000 km");
  });

  test("handles null, undefined, NaN, and Infinity", () => {
    assert.equal(formatKm(null), "—");
    assert.equal(formatKm(undefined), "—");
    assert.equal(formatKm(NaN), "—");
    assert.equal(formatKm(Infinity), "—");
    assert.equal(formatKm(-Infinity), "—");
  });
});
