// Unit tests for the pure optimisation helpers in the SDK.
// No network, no credentials, no provider calls - safe to run anywhere.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { TokenSave } = require("../sdk/tokensave.js");

test("sensible defaults: anthropic, auto quality, all layers on", () => {
  const ts = new TokenSave();
  assert.equal(ts.provider, "anthropic");
  assert.equal(ts.quality, "auto");
  assert.equal(ts.enableCache, true);
  assert.equal(ts.enableRouting, true);
  assert.equal(ts.enableCompression, true);
});

test("routing table covers every advertised provider with two distinct tiers", () => {
  const ts = new TokenSave();
  for (const provider of ["anthropic", "openai", "google", "groq"]) {
    const models = ts.models[provider];
    assert.ok(models, provider + " is missing from the routing table");
    assert.ok(models.simple, provider + " has no cheap model");
    assert.ok(models.complex, provider + " has no capable model");
    assert.notEqual(
      models.simple,
      models.complex,
      provider + " routes both tiers to the same model, so routing saves nothing"
    );
  }
});

test("complexity detection protects quality on code and analysis prompts", () => {
  const ts = new TokenSave();
  assert.equal(ts._detectComplexity("what is the capital of France"), "simple");
  assert.equal(
    ts._detectComplexity("analyze this quarterly report and compare the segments"),
    "complex"
  );
  assert.equal(ts._detectComplexity("function add(a, b) { return a + b }"), "complex");
});

test("compression leaves short prompts untouched", () => {
  const ts = new TokenSave();
  const out = ts._compress("hi there");
  assert.equal(out.saved, 0);
  assert.equal(out.text, "hi there");
});

test("compression removes filler and reports what it saved", () => {
  const ts = new TokenSave();
  const input =
    "To be honest with you, I would like to say that the thing is that this " +
    "sentence carries a great deal of filler which adds nothing of value.";
  const out = ts._compress(input);
  assert.ok(out.saved > 0, "expected filler phrases to be removed");
  assert.ok(out.text.toLowerCase().indexOf("to be honest with you") === -1);
  assert.ok(out.text.length < input.length);
});

test("compression never adds content and keeps the substance", () => {
  const ts = new TokenSave();
  const input =
    "Needless to say, the deployment pipeline should stay reproducible across " +
    "every environment we support.";
  const out = ts._compress(input);
  assert.ok(out.text.indexOf("deployment pipeline") !== -1);
  assert.ok(out.text.length <= input.length);
});

test("token estimate is a non-negative integer that grows with input", () => {
  const ts = new TokenSave();
  assert.equal(ts._estimateTokens(""), 0);
  assert.equal(Number.isInteger(ts._estimateTokens("some prompt text")), true);
  const short = ts._estimateTokens("a".repeat(40));
  const long = ts._estimateTokens("a".repeat(400));
  assert.ok(long > short);
});

test("cache key is deterministic and separates different conversations", () => {
  const ts = new TokenSave();
  assert.equal(ts._hash("user:hello"), ts._hash("user:hello"));
  assert.notEqual(ts._hash("user:hello"), ts._hash("user:goodbye"));
});
