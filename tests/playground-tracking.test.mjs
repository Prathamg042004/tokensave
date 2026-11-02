import test from "node:test";
import assert from "node:assert/strict";
import { loadRoute, storage, request } from "./helpers/routes.mjs";
const body = {
  provider: "openai",
  apiKey: "fake-provider-key",
  messages: [{ role: "user", content: "Hello" }],
};
const fixture = {
  choices: [{ message: { content: "OK" } }],
  usage: { prompt_tokens: 10, completion_tokens: 2 },
};
function setup(t) {
  const saved = { ...process.env },
    old = globalThis.fetch;
  Object.assign(process.env, {
    UPSTASH_REDIS_REST_URL: "https://redis.test",
    UPSTASH_REDIS_REST_TOKEN: "test",
    NEXT_PUBLIC_SUPABASE_URL: "https://auth.test",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test",
  });
  t.after(() => {
    globalThis.fetch = old;
    for (const k of [
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });
}
function signed(data = body) {
  const req = request(data);
  req.headers.set("Authorization", "Bearer session-token");
  return req;
}
test("verified playground session attributes misses and hits, batches log writes, and includes logging in timing", async (t) => {
  setup(t);
  const redis = storage(),
    logs = [],
    increments = [];
  let generations = 0,
    execs = 0;
  globalThis.fetch = async (url) =>
    new URL(String(url)).href === "https://auth.test/auth/v1/user"
      ? Response.json({ id: "owner" })
      : (generations++, Response.json(fixture));
  redis.hincrby = async (k, f, v) => increments.push([k, f, v]);
  redis.lpush = async (k, v) => logs.push([k, JSON.parse(v)]);
  const pipeline = redis.pipeline.bind(redis);
  redis.pipeline = () => {
    const p = pipeline(),
      exec = p.exec;
    p.exec = async () => {
      execs++;
      await new Promise((r) => setTimeout(r, 20));
      return exec();
    };
    return p;
  };
  const { POST } = loadRoute("proxy", redis);
  for (const hit of [false, true]) {
    const res = await POST(signed());
    assert.equal(res.status, 200);
    const meta = (await res.json()).tokensave_meta;
    assert.equal(meta.cache_hit, hit);
    assert.ok(meta.latency_ms >= 20, "timing includes awaited logging");
  }
  assert.equal(generations, 1);
  assert.equal(execs, 2, "one logging pipeline per request");
  const accountLogs = logs.filter(
    ([k]) => k === "billing:v1:request_logs:owner",
  );
  assert.equal(accountLogs.length, 2);
  assert.ok(accountLogs.every(([, v]) => v.userId === "owner"));
  assert.ok(increments.some(([k]) => k.includes("user_stats:owner:")));
  assert.equal(accountLogs[1][1].input_tokens, 0);
  assert.equal(accountLogs[1][1].cost, 0);
});
test("invalid session or conflicting API-key owner cannot generate, read cache, or log as another account", async (t) => {
  setup(t);
  const redis = storage();
  let generations = 0;
  globalThis.fetch = async (url) =>
    new URL(String(url)).href === "https://auth.test/auth/v1/user"
      ? new Response("", { status: 401 })
      : (generations++, Response.json(fixture));
  let response = await loadRoute("proxy", redis).POST(signed());
  assert.equal(response.status, 401);
  assert.equal(redis.calls.length, 0);
  globalThis.fetch = async (url) =>
    new URL(String(url)).href === "https://auth.test/auth/v1/user"
      ? Response.json({ id: "owner" })
      : (generations++, Response.json(fixture));
  const key = "ts_live_" + "a".repeat(32);
  redis.values.set("key_owner:" + key, { userId: "other" });
  redis.values.set("user_key:other", key);
  response = await loadRoute("proxy", redis).POST(
    signed({ ...body, tsKey: key }),
  );
  assert.equal(response.status, 403);
  assert.equal(generations, 0);
});
test("batch preserves verified session attribution for every prompt", async (t) => {
  setup(t);
  const redis = storage(),
    logs = [];
  globalThis.fetch = async (url) =>
    new URL(String(url)).href === "https://auth.test/auth/v1/user"
      ? Response.json({ id: "owner" })
      : Response.json(fixture);
  redis.lpush = async (k, v) => logs.push([k, JSON.parse(v)]);
  const response = await loadRoute("batch", redis).POST(
    signed({ ...body, prompts: ["Hello", "Goodbye"] }),
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).successful, 2);
  assert.equal(
    logs.filter(([k]) => k === "billing:v1:request_logs:owner").length,
    2,
  );
});
test("logging failures do not discard a successful provider response", async (t) => {
  setup(t);
  const redis = storage();
  redis.pipeline = () => ({
    hincrby() {
      return this;
    },
    lpush() {
      return this;
    },
    ltrim() {
      return this;
    },
    exec: async () => {
      throw new Error("offline");
    },
  });
  globalThis.fetch = async () => Response.json(fixture);
  assert.equal(
    (await loadRoute("proxy", redis).POST(request(body))).status,
    200,
  );
});
