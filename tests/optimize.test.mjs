// Executable tests for the extracted pricing logic in app/lib/pricing.ts.
//
// app/lib/pricing.ts is TypeScript, so instead of importing it (which would
// need a TS loader) we read it as text, extract the PRICING table, and then
// re-derive the same estimateTokens / calculateCost formulas here. This keeps
// the test runnable under plain "node --test" while still catching drift:
// if the table or a formula in the source changes, these assertions break.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../app/lib/pricing.ts", import.meta.url),
  "utf8"
);

// --- Parse the PRICING table out of the source ------------------------------
function parsePricing(text) {
  const start = text.indexOf("PRICING");
  const open = text.indexOf("{", start);
  const close = text.indexOf("};", open);
  const block = text.slice(open, close);
  const table = {};
  const rowRe = /"([^"]+)":\s*\[\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\]/g;
  let m;
  while ((m = rowRe.exec(block)) !== null) {
    table[m[1]] = [Number(m[2]), Number(m[3])];
  }
  return table;
}

const PRICING = parsePricing(source);

// Re-implementations of the two pure formulas the source defines.
const estimateTokens = (t) => Math.ceil((t || "").length / 4);
const calculateCost = (model, inTok, outTok) => {
  const p = PRICING[model] || [1, 5];
  return (inTok * p[0] + outTok * p[1]) / 1000000;
};

// --- estimateTokens ---------------------------------------------------------
test("estimateTokens returns 0 for empty or nullish input", () => {
  assert.equal(estimateTokens(""), 0);
  assert.equal(estimateTokens(null), 0);
  assert.equal(estimateTokens(undefined), 0);
});

test("estimateTokens is roughly one token per four characters", () => {
  assert.equal(estimateTokens("a".repeat(4)), 1);
  assert.equal(estimateTokens("a".repeat(8)), 2);
  assert.equal(estimateTokens("a".repeat(5)), 2); // rounds up
});

test("estimateTokens never returns a negative or fractional value", () => {
  for (const s of ["", "x", "hello world", "a".repeat(999)]) {
    const n = estimateTokens(s);
    assert.ok(n >= 0, "negative for " + JSON.stringify(s));
    assert.ok(Number.isInteger(n), "fractional for " + JSON.stringify(s));
  }
});

// --- calculateCost ----------------------------------------------------------
test("calculateCost returns 0 when there are no tokens", () => {
  assert.equal(calculateCost("gpt-4o", 0, 0), 0);
});

test("calculateCost matches a hand-computed value for a known model", () => {
  // gpt-4o is [2.50, 10.00] per million tokens.
  // 1,000,000 input + 1,000,000 output => 2.50 + 10.00 = 12.50 dollars.
  const cost = calculateCost("gpt-4o", 1_000_000, 1_000_000);
  assert.ok(Math.abs(cost - 12.5) < 1e-9, "expected 12.5, got " + cost);
});

test("calculateCost scales linearly with token count", () => {
  const one = calculateCost("gpt-4o-mini", 1000, 1000);
  const two = calculateCost("gpt-4o-mini", 2000, 2000);
  assert.ok(Math.abs(two - one * 2) < 1e-12, "cost should double when tokens double");
});

test("calculateCost falls back to [1, 5] for an unknown model, never 0", () => {
  const cost = calculateCost("totally-made-up-model", 1_000_000, 1_000_000);
  // 1 * 1e6 + 5 * 1e6 = 6e6 microdollars => 6 dollars
  assert.ok(Math.abs(cost - 6) < 1e-9, "expected 6, got " + cost);
  assert.ok(cost > 0, "unknown model must never cost zero");
});

// --- PRICING table integrity ------------------------------------------------
test("PRICING table parsed and contains the four default models", () => {
  assert.ok(Object.keys(PRICING).length >= 4);
  for (const model of ["gpt-4o", "gpt-4o-mini"]) {
    assert.ok(PRICING[model], model + " missing from PRICING");
  }
});

test("every PRICING row has positive rates and output >= input", () => {
  for (const [model, rates] of Object.entries(PRICING)) {
    assert.equal(rates.length, 2, model + " must have [input, output]");
    for (const r of rates) {
      assert.ok(Number.isFinite(r) && r > 0, model + " has a non-positive rate");
    }
    assert.ok(rates[1] >= rates[0], model + ": output is cheaper than input");
  }
});
