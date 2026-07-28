// Guards the rule in CONTRIBUTING.md that cost tracking stays accurate.
// If the router can return a model with no price entry, the proxy falls back
// to a made-up rate and every savings number it reports becomes fiction.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/api/proxy/route.ts", import.meta.url), "utf8");

function quotedStrings(text) {
  return text.split('"').filter((part, i) => i % 2 === 1);
}

function bodyOf(name) {
  const start = source.indexOf("function " + name);
  assert.ok(start !== -1, name + " was not found in app/api/proxy/route.ts");
  const next = source.indexOf("function ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

const pricingStart = source.indexOf("const PRICING");
const pricingBlock = source.slice(pricingStart, source.indexOf("};", pricingStart));
const priced = new Set(quotedStrings(pricingBlock));

const NOT_A_MODEL = new Set(["simple", "complex", "anthropic", "openai", "google", "groq"]);

test("the pricing table exists and is populated", () => {
  assert.ok(pricingStart !== -1, "PRICING table not found in the proxy route");
  assert.ok(priced.size >= 4, "expected prices for at least the four default models");
});

test("every model the router can pick has a price", () => {
  for (const fn of ["pickModel", "getExpensiveModel"]) {
    for (const value of quotedStrings(bodyOf(fn))) {
      if (NOT_A_MODEL.has(value)) continue;
      assert.ok(
        priced.has(value),
        value + " is routed to by " + fn + " but has no PRICING entry, so its cost would be guessed"
      );
    }
  }
});

test("every price entry has a positive input and output rate", () => {
  const rows = pricingBlock
    .split(String.fromCharCode(10))
    .filter((line) => line.indexOf('": [') !== -1);
  assert.ok(rows.length >= 4, "expected at least four priced models");
  for (const row of rows) {
    const rates = row
      .slice(row.indexOf("[") + 1, row.indexOf("]"))
      .split(",")
      .map((value) => Number(value.trim()));
    assert.equal(rates.length, 2, "expected [input, output] rates in: " + row.trim());
    for (const rate of rates) {
      assert.ok(Number.isFinite(rate) && rate > 0, "rates must be positive in: " + row.trim());
    }
    assert.ok(rates[1] >= rates[0], "output tokens are never cheaper than input: " + row.trim());
  }
});
