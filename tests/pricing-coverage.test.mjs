import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { PRICING, accounting, cacheAccounting, normalizeUsage } = createRequire(
  import.meta.url,
)("../sdk/accounting.js");
const openai = (input = 1000, output = 100) => ({
  usage: { prompt_tokens: input, completion_tokens: output },
});
test("published price registry contains finite positive rates, scoped by provider", () => {
  for (const models of Object.values(PRICING))
    for (const rates of Object.values(models)) {
      for (const rate of Object.values(rates))
        assert.ok(Number.isFinite(rate) && rate > 0);
    }
  assert.equal(accounting("groq", "gpt-4o-mini", openai()).cost, null);
});
test("OpenAI uses full reported output including reasoning, not serialized response length", () => {
  const data = openai(1000, 10000);
  data.usage.completion_tokens_details = { reasoning_tokens: 9000 };
  data.choices = [{ message: { content: "x".repeat(30000) } }];
  const result = accounting("openai", "gpt-4o-mini", data);
  assert.equal(result.output_tokens, 10000);
  assert.equal(result.cost, 0.00615);
  assert.equal(result.savings_percent, null);
  assert.equal(result.cost_saved, null);
});
test("OpenAI native cached tokens are discounted exactly once", () => {
  const data = openai();
  data.usage.prompt_tokens_details = { cached_tokens: 800 };
  assert.equal(accounting("openai", "gpt-4o-mini", data).cost, 0.00015);
});
test("Anthropic input combines base, native cache reads, and both cache write durations", () => {
  const data = {
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_read_input_tokens: 1000,
      cache_creation_input_tokens: 300,
      cache_creation: {
        ephemeral_5m_input_tokens: 100,
        ephemeral_1h_input_tokens: 200,
      },
    },
  };
  const result = accounting("anthropic", "claude-haiku-4-5-20251001", data);
  assert.equal(result.input_tokens, 1400);
  assert.equal(result.cost, 0.000975);
});
test("Anthropic legacy cache writes use the five-minute rate", () => {
  const data = {
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 1000000,
    },
  };
  assert.equal(accounting("anthropic", "claude-sonnet-4-6", data).cost, 3.75);
});
test("Gemini thoughts are included, Groq uses OpenAI-style usage, unverified prices stay unknown", () => {
  const data = {
    usageMetadata: {
      promptTokenCount: 10,
      candidatesTokenCount: 5,
      thoughtsTokenCount: 20,
    },
  };
  assert.equal(normalizeUsage("google", data).output_tokens, 25);
  assert.equal(accounting("google", "gemini-2.0-flash", data).cost, null);
  assert.equal(
    accounting("groq", "llama-3.1-8b-instant", openai()).input_tokens,
    1000,
  );
});
test("missing, fractional, negative, inconsistent and unsafe usage never becomes a guessed charge", () => {
  for (const data of [
    {},
    { usage: {} },
    openai(-1),
    openai(0.5),
    openai(Number.MAX_SAFE_INTEGER),
    {
      usage: {
        prompt_tokens: 1,
        completion_tokens: 1,
        prompt_tokens_details: { cached_tokens: 2 },
      },
    },
  ]) {
    assert.equal(accounting("openai", "gpt-4o-mini", data).cost, null);
  }
  assert.equal(accounting("openai", "unknown", openai()).cost, null);
  assert.equal(
    accounting("openai", "gpt-4o-mini", {
      ...openai(),
      model: "unknown-snapshot",
    }).cost,
    null,
  );
  assert.equal(
    accounting("openai", "gpt-4o-mini", {
      ...openai(),
      service_tier: "priority",
    }).cost,
    null,
  );
});
test("zero usage is valid; zero baseline never produces NaN, infinity or fabricated savings", () => {
  const original = accounting("openai", "gpt-4o-mini", openai(0, 0));
  assert.equal(original.cost, 0);
  const cached = cacheAccounting(original);
  assert.equal(cached.cost_saved, 0);
  assert.equal(cached.savings_percent, null);
});
test("cache hit avoids original recorded cost and tokens; missing pricing stays unknown", () => {
  const original = accounting("openai", "gpt-4o-mini", openai());
  const cached = cacheAccounting(original);
  assert.equal(cached.cost, 0);
  assert.equal(cached.cost_saved, original.cost);
  assert.equal(cached.tokens_saved, 1100);
  assert.equal(cached.input_tokens, 0);
  assert.equal(cached.output_tokens, 0);
  assert.equal(cached.savings_percent, 100);
  assert.equal(
    cacheAccounting(accounting("groq", "unknown", openai())).cost_saved,
    null,
  );
});
