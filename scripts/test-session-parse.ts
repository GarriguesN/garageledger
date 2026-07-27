// Real-logic tests for the session-cookie parser.
//
// Why this file exists (and why the previous text/regex checks were useless):
// in Ticket 1.3 we added a defense-in-depth call to `readSessionCookie()`
// inside two Server Components. The function expected a full Cookie header
// (e.g. "gl_sess=body.sig") but the SCs were passing just the value (e.g.
// "body.sig") from `cookies().get("gl_sess")?.value`. As a result, every
// request from a logged-in user was parsed as "no session", so the
// Garaje rendered empty and /coches/[id] redirected back to "/" for
// everyone — but the suite of 155 tests still reported 100% green,
// because those tests only grep'd source code for substrings.
//
// This file actually calls the parser functions with real inputs and
// checks the outputs. Run with:
//   tsx scripts/test-session-parse.ts

import {
  issueSessionCookie,
  readSessionCookie,
  readSessionFromValue,
  checkRate,
  clearSessionCookie,
} from "../src/lib/auth";

let pass = 0;
let fail = 0;
const fails: string[] = [];

function expect<T>(label: string, actual: T, expected: T) {
  const ok =
    actual === expected ||
    (actual !== null &&
      expected !== null &&
      typeof actual === "object" &&
      typeof expected === "object" &&
      JSON.stringify(actual) === JSON.stringify(expected));
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    fails.push(label);
    console.log(`  ❌ ${label}\n     actual:   ${JSON.stringify(actual)}\n     expected: ${JSON.stringify(expected)}`);
  }
}

function expectTruthy<T>(label: string, actual: T) {
  const ok = actual !== null && actual !== undefined;
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    fails.push(label);
    console.log(`  ❌ ${label}\n     actual: ${JSON.stringify(actual)}`);
  }
}
function expectNull<T>(label: string, actual: T) {
  if (actual === null) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    fails.push(label);
    console.log(`  ❌ ${label}\n     expected null, got: ${JSON.stringify(actual)}`);
  }
}

// Reset rate limiter by always using a unique IP per test group.
function uniqueIP(tag: string) {
  return `10.42.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}-${tag}`;
}

async function buildExpiredValue(): Promise<string> {
  // Forge a value with exp in the past. We build it the same way auth.ts
  // does, so we need its internal `sign` — but we can use HMAC directly
  // since both share SESSION_SECRET via getSecret() / process.env.
  const SECRET = process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32
    ? process.env.SESSION_SECRET
    : "garageledger-dev-secret-do-not-use-in-prod-min-32chars";
  const { createHmac } = await import("node:crypto");
  const b64url = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");
  const payload = JSON.stringify({ uid: "owner", iat: 0, exp: Date.now() - 1 });
  const body = b64url(payload);
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

async function main() {

console.log("\n=== 1) issueSessionCookie() produces a Set-Cookie header that parses back ===");
{
  const setCookie = issueSessionCookie();
  // Format: "gl_sess=body.sig; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200"
  if (!setCookie.startsWith("gl_sess=")) {
    fail++;
    fails.push("issueSessionCookie() starts with 'gl_sess='");
    console.log(`  ❌ header does not start with gl_sess: ${setCookie.slice(0, 60)}`);
  } else {
    pass++;
    console.log("  ✅ header starts with gl_sess=");
  }
  const value = setCookie.split(";")[0].slice("gl_sess=".length);
  const payload = readSessionFromValue(value);
  expectTruthy("parse(issueSessionCookie's value) returns a payload", payload);
  if (payload && typeof payload === "object") {
    expect("payload.uid is 'owner'", (payload as any).uid, "owner");
    expect("payload.iat is a number > 0", typeof (payload as any).iat === "number" && (payload as any).iat > 0, true);
    const exp = (payload as any).exp as number;
    expect("payload.exp is in the future (> now)", exp > Date.now(), true);
  }
}

console.log("\n=== 2) readSessionFromValue(value) === readSessionCookie('gl_sess=' + value) (compat) ===");
{
  const setCookie = issueSessionCookie();
  const value = setCookie.split(";")[0].slice("gl_sess=".length);
  const fromValue = readSessionFromValue(value);
  const fromHeader = readSessionCookie(`gl_sess=${value}`);
  expect("both parsers return the same payload", JSON.stringify(fromValue) === JSON.stringify(fromHeader), true);

  // Sanity check: bug from Ticket 1.3 — does readSessionCookie handle a RAW
  // value the way the SCs were calling it? It MUST return null (the SCs
  // were wrong to pass it that way). The correct call is readSessionFromValue.
  const wrongCall = readSessionCookie(value);
  expectNull("readSessionCookie(<just the value>) returns null (this is the bug we fixed)", wrongCall);
}

console.log("\n=== 3) Tamper detection ===");
{
  const setCookie = issueSessionCookie();
  const value = setCookie.split(";")[0].slice("gl_sess=".length);
  // Mutate the last char of the signature by flipping one nibble.
  const dot = value.lastIndexOf(".");
  const sig = value.slice(dot + 1);
  const lastChar = sig[sig.length - 1];
  const flipped = lastChar === "A" ? "B" : "A";
  const tamperedValue = value.slice(0, dot + 1) + sig.slice(0, -1) + flipped;
  expectNull("readSessionFromValue rejects tampered signature", readSessionFromValue(tamperedValue));
  expectNull("readSessionCookie('gl_sess='+tampered) rejects tampered signature", readSessionCookie(`gl_sess=${tamperedValue}`));

  // Mutate the body (not the signature).
  const body = value.slice(0, dot);
  const tamperedBodyValue = "X" + body.slice(1) + "." + sig;
  expectNull("readSessionFromValue rejects tampered body", readSessionFromValue(tamperedBodyValue));
}

console.log("\n=== 4) Expired cookie ===");
{
  const expiredValue = await buildExpiredValue();
  expectNull("readSessionFromValue rejects expired cookie", readSessionFromValue(expiredValue));
  expectNull("readSessionCookie('gl_sess='+expired) rejects expired cookie", readSessionCookie(`gl_sess=${expiredValue}`));
}

console.log("\n=== 5) Edge cases ===");
{
  expectNull("readSessionFromValue(undefined)", readSessionFromValue(undefined));
  expectNull("readSessionFromValue(null)", readSessionFromValue(null));
  expectNull("readSessionFromValue('')", readSessionFromValue(""));
  expectNull("readSessionFromValue('nopoint')", readSessionFromValue("nopoint"));
  expectNull("readSessionFromValue('.sig-without-body')", readSessionFromValue(".sig-without-body"));
  expectNull("readSessionFromValue('body.')", readSessionFromValue("body."));
  // Valid-looking but with garbage in body (JSON.parse fails inside)
  expectNull("readSessionFromValue('not-base64.not-hex')", readSessionFromValue("not-base64.not-hex"));
}

console.log("\n=== 6) Header parsing (multiple cookies, different order) ===");
{
  const setCookie = issueSessionCookie();
  const value = setCookie.split(";")[0].slice("gl_sess=".length);
  expectTruthy("'gl_sess=v; theme=dark' parses correctly", readSessionCookie(`gl_sess=${value}; theme=dark`));
  expectTruthy("'theme=dark; gl_sess=v' parses correctly (order-independent)", readSessionCookie(`theme=dark; gl_sess=${value}`));
  expectNull("'theme=dark' (no gl_sess at all) returns null", readSessionCookie("theme=dark"));
  expectNull("'' (empty header) returns null", readSessionCookie(""));
}

console.log("\n=== 7) Rate limiter ===");
{
  const ip = uniqueIP("rate-limit");
  // 5 successes
  for (let i = 0; i < 5; i++) {
    expect(`5 allowed hits — attempt #${i + 1}`, checkRate(ip).ok, true);
  }
  // 6th should be rejected (429 semantic)
  const sixth = checkRate(ip);
  expect("6th hit is blocked", sixth.ok, false);
  if (!sixth.ok) {
    expect("blocked response has retryAfterSec > 0", sixth.retryAfterSec > 0, true);
    expect("blocked response has retryAfterSec <= 60", sixth.retryAfterSec <= 60, true);
  }
  // Independent IPs have independent buckets
  const other = uniqueIP("rate-limit-other");
  expect("different IP is allowed", checkRate(other).ok, true);
}

console.log("\n=== 8) clearSessionCookie() emits an invalidating Set-Cookie ===");
{
  const out = clearSessionCookie();
  expect("clearSessionCookie contains Max-Age=0", out.includes("Max-Age=0"), true);
  expect("clearSessionCookie uses HttpOnly", out.includes("HttpOnly"), true);
  expect("clearSessionCookie uses SameSite=Lax", out.includes("SameSite=Lax"), true);
  expect("clearSessionCookie targets gl_sess", out.startsWith("gl_sess="), true);
}

console.log("\n---");
console.log(`Session parser: Passed ${pass} / ${pass + fail}`);
if (fail > 0) {
  console.log("FAILURES:");
  fails.forEach((f) => console.log("  - " + f));
  process.exit(1);
}
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
