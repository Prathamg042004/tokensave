import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { TokenSave, TokenSaveError, providerRequest } = createRequire(
  import.meta.url,
)("../sdk/tokensave.js");
const good = (provider = "openai") =>
  provider === "anthropic"
    ? {
        content: [{ type: "text", text: "OK" }],
        usage: { input_tokens: 10, output_tokens: 5 },
      }
    : provider === "google"
      ? {
          candidates: [{ content: { parts: [{ text: "OK" }] } }],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        }
      : {
          choices: [{ message: { role: "assistant", content: "OK" } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        };
function client(config = {}) {
  return new TokenSave({
    provider: "openai",
    apiKey: "test-credential",
    ...config,
  });
}
test("HTTP errors throw typed sanitized errors and are never cached", async () => {
  let calls = 0;
  const ts = client({
    fetch: async () => {
      calls++;
      return Response.json(
        { error: { message: "secret-credential" } },
        { status: 401 },
      );
    },
  });
  for (let i = 0; i < 2; i++)
    await assert.rejects(
      ts.chat("hello"),
      (e) =>
        e instanceof TokenSaveError &&
        e.status === 401 &&
        !e.message.includes("secret"),
    );
  assert.equal(calls, 2);
  assert.equal(ts.cache.size, 0);
  assert.equal(ts.getStats().errors, 2);
});
test("cache separates model, output limit and credential; returned objects cannot poison it", async () => {
  let calls = 0;
  const ts = client({
    fetch: async () => {
      calls++;
      return Response.json(good());
    },
  });
  const first = await ts.chat("hello", { model: "gpt-4o-mini" });
  first.choices[0].message.content = "mutated";
  const cached = await ts.chat("hello", { model: "gpt-4o-mini" });
  assert.equal(cached.choices[0].message.content, "OK");
  assert.equal(cached._tokensave.cache, true);
  cached.choices[0].message.content = "again";
  assert.equal(
    (await ts.chat("hello", { model: "gpt-4o-mini" })).choices[0].message
      .content,
    "OK",
  );
  await ts.chat("hello", { model: "gpt-4o" });
  await ts.chat("hello", { model: "gpt-4o-mini", maxTokens: 100 });
  ts.apiKey = "rotated-credential";
  await ts.chat("hello", { model: "gpt-4o-mini" });
  assert.equal(calls, 4);
});
test("cache encoding cannot collide at message boundaries", async () => {
  let calls = 0;
  const ts = client({
    fetch: async () => {
      calls++;
      return Response.json(good());
    },
  });
  await ts.chat([{ role: "user", content: "xassistanty" }]);
  await ts.chat([
    { role: "user", content: "x" },
    { role: "assistant", content: "y" },
  ]);
  assert.equal(calls, 2);
});
test("TTL, capacity, clearing and cache-disabled mode are respected", async () => {
  let calls = 0;
  const ts = client({
    maxCacheEntries: 1,
    fetch: async () => {
      calls++;
      return Response.json(good());
    },
  });
  await ts.chat("a");
  await ts.chat("b");
  assert.equal(ts.cache.size, 1);
  for (const v of ts.cache.values()) v.time = 0;
  await ts.chat("b");
  assert.equal(calls, 3);
  ts.clearCache();
  assert.equal(ts.cache.size, 0);
  ts.enableCache = false;
  await ts.chat("b");
  await ts.chat("b");
  assert.equal(calls, 5);
});
test("fallback adapts every provider, preserves max_quality and never caches under primary", async () => {
  for (const target of ["anthropic", "google", "groq"]) {
    const requests = [];
    const ts = client({
      quality: "max_quality",
      fallbackKeys: { [target]: "fallback-key" },
      fetch: async (url, init) => {
        requests.push({ url, body: JSON.parse(init.body) });
        return requests.length % 2 === 1
          ? Response.json({ error: {} }, { status: 429 })
          : Response.json(good(target));
      },
    });
    const out = await ts.chat("hi");
    assert.equal(out._tokensave.fallback, target);
    assert.equal(out._tokensave.model, ts.models[target].complex);
    assert.equal(ts.cache.size, 0);
    await ts.chat("hi");
    assert.equal(requests.length, 4);
  }
});
test("invalid JSON, malformed success and error-in-200 responses never enter cache", async () => {
  for (const response of [
    () => new Response("oops"),
    () => Response.json({}),
    () => Response.json({ error: "bad" }),
  ]) {
    const ts = client({ fetch: async () => response() });
    await assert.rejects(ts.chat("hi"), (e) => e.code === "invalid_response");
    assert.equal(ts.cache.size, 0);
  }
});
test("network failures are not retried; cancellation and timeout are bounded", async () => {
  let calls = 0;
  const ts = client({
    fetch: async () => {
      calls++;
      throw Error("secret");
    },
    fallbackKeys: { groq: "other-key" },
  });
  await assert.rejects(ts.chat("hi"), (e) => e.code === "network_error");
  assert.equal(calls, 1);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    ts.chat("hi", { signal: controller.signal }),
    (e) => e.code === "aborted",
  );
  assert.equal(calls, 1);
  const timed = client({
    timeoutMs: 10,
    fetch: (_url, { signal }) =>
      new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(Error("timeout")), {
          once: true,
        });
        setTimeout(() => reject(Error("test safety deadline")), 100);
      }),
  });
  await assert.rejects(timed.chat("hi"), (e) => e.code === "aborted");
});
test("validation fails before network calls and routing-disabled requires a model", async () => {
  let calls = 0;
  const ts = client({
    routing: false,
    fetch: async () => {
      calls++;
      return Response.json(good());
    },
  });
  for (const prompt of [[], [null], [{ role: "tool", content: "hi" }], ""])
    await assert.rejects(ts.chat(prompt));
  await assert.rejects(ts.chat("hi"));
  assert.equal(calls, 0);
  await ts.chat("hi", { model: "gpt-4o-mini" });
  assert.equal(calls, 1);
  assert.throws(() => client({ provider: "unknown" }));
  assert.throws(() => client({ timeoutMs: 0 }));
});
test("provider adapters preserve system instructions and verbatim code without URL credentials", () => {
  const messages = [
    { role: "system", content: "rules" },
    { role: "user", content: "def x():\n    return 42" },
  ];
  const a = providerRequest("anthropic", "model", "secret", messages, 200);
  assert.equal(a.body.system, "rules");
  assert.equal(a.body.messages.length, 1);
  assert.equal(a.body.max_tokens, 200);
  const g = providerRequest("google", "model", "secret", messages, 200);
  assert.ok(!g.url.includes("secret"));
  assert.equal(g.body.systemInstruction.parts[0].text, "rules");
  assert.equal(g.body.contents[0].parts[0].text, messages[1].content);
  assert.equal(
    client()._compress(messages[1].content).text,
    messages[1].content,
  );
});
test("stats count cache avoided cost once and expose unknown cost instead of fake zero charges", async () => {
  const ts = client({ fetch: async () => Response.json(good()) });
  const first = await ts.chat("hi");
  await ts.chat("hi");
  const stats = ts.getStats();
  assert.equal(stats.totalCost, first._tokensave.cost);
  assert.equal(stats.totalSaved, first._tokensave.cost);
  assert.equal(stats.tokensSaved, 15);
  stats.latencies.push(9999);
  assert.equal(ts.getStats().latencies.length, 2);
  const unknown = client({
    fetch: async () =>
      Response.json({ choices: [{ message: { content: "hi" } }] }),
  });
  await unknown.chat("hi");
  assert.equal(unknown.getStats().unknownCostRequests, 1);
});
