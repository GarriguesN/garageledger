import { test, describe } from "node:test";
import assert from "node:assert";
import { resolveIcon, ICONS } from "./icons";

describe("resolveIcon", () => {
  test("returns the correct icon for a valid name", () => {
    assert.strictEqual(resolveIcon("fuel"), ICONS.fuel);
    assert.strictEqual(resolveIcon("menu"), ICONS.menu);
    assert.strictEqual(resolveIcon("settings"), ICONS.settings);
  });

  test("returns circleDot when name is undefined", () => {
    assert.strictEqual(resolveIcon(undefined), ICONS.circleDot);
  });

  test("returns circleDot when name is null", () => {
    assert.strictEqual(resolveIcon(null), ICONS.circleDot);
  });

  test("returns circleDot when name is empty or invalid (at runtime)", () => {
    // We cast to any to simulate invalid runtime input since TypeScript would prevent it
    assert.strictEqual(resolveIcon("" as any), ICONS.circleDot);
    assert.strictEqual(resolveIcon("unknown_icon" as any), ICONS.circleDot);
  });
});
