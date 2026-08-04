import test from "node:test";
import assert from "node:assert";
import { vehicleSubtitle } from "./vehicle";

test("vehicleSubtitle", async (t) => {
  await t.test("combines year and motor with a separator", () => {
    assert.strictEqual(
      vehicleSubtitle({ ano: 2009, motor: "1.8 i-VTEC", combustible: "Gasolina" }),
      "2009 · 1.8 i-VTEC"
    );
  });

  await t.test("works with only year", () => {
    assert.strictEqual(
      vehicleSubtitle({ ano: 2015, motor: "" }),
      "2015"
    );
  });

  await t.test("works with only motor", () => {
    assert.strictEqual(
      vehicleSubtitle({ ano: null, motor: "2.0 TDI" }),
      "2.0 TDI"
    );
  });

  await t.test("works with neither", () => {
    assert.strictEqual(
      vehicleSubtitle({ ano: null, motor: "" }),
      ""
    );
  });

  await t.test("ignores combustible", () => {
    assert.strictEqual(
      vehicleSubtitle({ ano: 2020, motor: "Electric", combustible: "Eléctrico" }),
      "2020 · Electric"
    );
  });
});
