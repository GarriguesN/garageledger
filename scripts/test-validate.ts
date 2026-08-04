import "./lib/test-db"; // Fija DB_PATH aunque validate no use BD, por consistencia con la suite
import { parseAmount } from "../src/lib/validate";

let pass = 0, fail = 0;
function expect(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

console.log("\n=== Testing parseAmount ===");

// ── 1) Happy paths: valid positive numbers and strings ──
expect("parseAmount(12) === 12", parseAmount(12) === 12);
expect("parseAmount(12.5) === 12.5", parseAmount(12.5) === 12.5);
expect("parseAmount('12') === 12", parseAmount("12") === 12);
expect("parseAmount('12.5') === 12.5", parseAmount("12.5") === 12.5);
expect("parseAmount(' 12.5 ') === 12.5", parseAmount(" 12.5 ") === 12.5);
expect("parseAmount(0) === 0", parseAmount(0) === 0);
expect("parseAmount('0') === 0", parseAmount("0") === 0);

// ── 2) Edge cases: negative values (must be >= 0) ──
expect("parseAmount(-12) === null", parseAmount(-12) === null);
expect("parseAmount('-12') === null", parseAmount("-12") === null);
expect("parseAmount(-0.5) === null", parseAmount(-0.5) === null);

// ── 3) Invalid formats: scientific notation, letters, etc. ──
expect("parseAmount('12e3') === null", parseAmount("12e3") === null);
expect("parseAmount('12abc') === null", parseAmount("12abc") === null);
expect("parseAmount('abc') === null", parseAmount("abc") === null);
expect("parseAmount('1.2.3') === null", parseAmount("1.2.3") === null);

// ── 4) Invalid types: NaN, Infinity, null, objects, undefined ──
expect("parseAmount(NaN) === null", parseAmount(NaN) === null);
expect("parseAmount(Infinity) === null", parseAmount(Infinity) === null);
expect("parseAmount(-Infinity) === null", parseAmount(-Infinity) === null);
expect("parseAmount(null) === null", parseAmount(null) === null);
expect("parseAmount(undefined) === null", parseAmount(undefined) === null);
expect("parseAmount({}) === null", parseAmount({}) === null);
expect("parseAmount([]) === null", parseAmount([]) === null);

console.log(`\nparseAmount tests: Passed ${pass} / ${pass + fail}`);
if (fail) process.exit(1);
