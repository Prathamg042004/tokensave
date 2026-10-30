// Real loopback HTTP transport; fake credentials and deterministic provider fixtures only.
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { createRequire } from "node:module";
const { TokenSave } = createRequire(import.meta.url)("../sdk/tokensave.js");

test("SDK completes real HTTP, cache, fallback and response-body timeout flows", async (t) => {
  const requests = [];
  let mode = "success";
  const server = http.createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    requests.push({
      path: req.url,
      headers: req.headers,
      body: JSON.parse(body),
    });
    res.setHeader("content-type", "application/json");
    if (mode === "slow") {
      res.writeHead(200);
      res.write("{");
      return;
    }
    if (mode === "fallback" && req.url === "/openai") {
      res.writeHead(429);
      res.end(JSON.stringify({ error: { message: "quota" } }));
      return;
    }
    if (req.url === "/anthropic") {
      res.end(
        JSON.stringify({
          content: [{ type: "text", text: "fallback response" }],
          model: "claude-haiku-4-5-20251001",
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      );
      return;
    }
    res.end(
      JSON.stringify({
        choices: [{ message: { content: "x".repeat(20000) } }],
        model: "gpt-4o-mini-2024-07-18",
        usage: {
          prompt_tokens: 200,
          completion_tokens: 5000,
          total_tokens: 5200,
        },
      }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const origin = "http://127.0.0.1:" + server.address().port;
  const transport = (url, init) =>
    fetch(
      origin +
        (new URL(url).hostname === "api.anthropic.com"
          ? "/anthropic"
          : "/openai"),
      init,
    );
  const sdk = new TokenSave({
    provider: "openai",
    apiKey: "fake-primary-key",
    fetch: transport,
  });
  const first = await sdk.chat("hello", { maxTokens: 6000 });
  assert.equal(first._tokensave.output_tokens, 5000);
  assert.equal(first._tokensave.cost, 0.00303);
  assert.equal(requests[0].body.max_tokens, 6000);
  first._tokensave.cost = 999;
  const hit = await sdk.chat("hello", { maxTokens: 6000 });
  assert.equal(requests.length, 1);
  assert.equal(hit._tokensave.cost_saved, 0.00303);
  assert.equal(hit._tokensave.tokens_saved, 5200);
  mode = "fallback";
  const fallback = new TokenSave({
    provider: "openai",
    apiKey: "fake-primary-key",
    fallbackKeys: { anthropic: "fake-fallback-key" },
    fetch: transport,
  });
  const result = await fallback.chat([
    { role: "system", content: "Follow these rules" },
    { role: "user", content: "hi" },
  ]);
  assert.equal(result._tokensave.fallback, "anthropic");
  assert.equal(result._tokensave.cost, 0.00035);
  assert.equal(requests.at(-1).body.system, "Follow these rules");
  assert.equal(requests.at(-1).headers["x-api-key"], "fake-fallback-key");
  mode = "slow";
  const timed = new TokenSave({
    provider: "openai",
    apiKey: "fake-key",
    fetch: transport,
    timeoutMs: 50,
  });
  await assert.rejects(timed.chat("timeout"), (e) => e.code === "aborted");
  assert.equal(timed.cache.size, 0);
});
