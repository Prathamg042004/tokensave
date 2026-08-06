// Extended behavioural tests for the SDK's pure helpers.
// Complements sdk.test.mjs by covering edge cases and the
// stats/cache helpers. No network, no credentials.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { TokenSave } = require("../sdk/tokensave.js");

test("constructor honours explicit options over defaults", () => {
  const ts = new TokenSave({
    provider: "openai",
    quality: "cheap",
    enableCache: false,
    enableRouting: false,
    enableCompression: false,
  });
  assert.equal(ts.provider, "openai");
  assert.equal(ts.quality, "cheap");
  assert.equal(ts.enableCache, false);
  assert.equal(ts.enableRouting, false);
  assert.equal(ts.enableCompression, false);
});

test("token estimate handles empty, whitespace and unicode safely", () => {
  const ts = new TokenSave();
  assert.equal(ts._estimateTokens(""), 0);
  assert.ok(ts._estimateTokens("   ") >= 0);
  assert.ok(Number.isInteger(ts._estimateTokens("emoji test and accents eau")));
});

test("token estimate never returns a negative number", () => {
  const ts = new TokenSave();
  for (const s of ["", "a", "a".repeat(1000), "\n\n\n"]) {
    assert.ok(ts._estimateTokens(s) >= 0, "negative estimate for: " + JSON.stringify(s));
  }
});

test("complexity detection is stable when called twice on the same input", () => {
  const ts = new TokenSave();
  const prompt = "analyze this dataset and summarise the trends";
  assert.equal(ts._detectComplexity(prompt), ts._detectComplexity(prompt));
});

test("complexity detection treats a trivial greeting as simple", () => {
  const ts = new TokenSave();
  assert.equal(ts._detectComplexity("hi"), "simple");
});

test("compression is idempotent: compressing twice changes nothing further", () => {
  const ts = new TokenSave();
  const input =
    "To be honest with you, the thing is that this text has a great deal " +
    "of filler that adds nothing of value to the reader.";
  const once = ts._compress(input).text;
  const twice = ts._compress(once).text;
  assert.equal(once, twice, "second compression pass should be a no-op");
});

test("compression never throws on empty or whitespace-only input", () => {
  const ts = new TokenSave();
  assert.doesNotThrow(() => ts._compress(""));
  assert.doesNotThrow(() => ts._compress("     "));
  assert.equal(ts._compress("").saved, 0);
});

test("cache key is stable across calls and order-sensitive", () => {
  const ts = new TokenSave();
  assert.equal(ts._hash("role:user|content:hello"), ts._hash("role:user|content:hello"));
  assert.notEqual(ts._hash("a|b"), ts._hash("b|a"));
});

test("cache key returns a non-empty string for any input", () => {
  const ts = new TokenSave();
  for (const s of ["", "x", "a".repeat(5000)]) {
    const h = ts._hash(s);
    assert.equal(typeof h, "string");
    assert.ok(h.length > 0, "empty hash for input length " + s.length);
  }
});

test("getStats returns an object without throwing before any requests", () => {
  const ts = new TokenSave();
  assert.doesNotThrow(() => ts.getStats());
  const stats = ts.getStats();
  assert.equal(typeof stats, "object");
  assert.notEqual(stats, null);
});

test("clearCache is safe to call and leaves the instance usable", () => {
  const ts = new TokenSave();
  assert.doesNotThrow(() => ts.clearCache());
  assert.equal(ts._detectComplexity("hello there"), "simple");
});
