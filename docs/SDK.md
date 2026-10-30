# Server SDK 2.1

Requires Node.js 20.9+ and a provider credential. Copy the **entire `sdk/` directory**; `tokensave.js` imports `accounting.js`. No npm package or browser build is published. Keep credentials on the server. No SDK telemetry is transmitted.

```js
const { TokenSave, TokenSaveError } = require("./sdk/tokensave.js");
const client = new TokenSave({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY,
  timeoutMs: 30000,
  cacheTTL: 1800000,
  maxCacheEntries: 256,
});
try {
  const response = await client.chat("Hello", { maxTokens: 256 });
  console.log(response._tokensave); // never log credentials or private prompts
} catch (error) {
  if (error instanceof TokenSaveError) console.error(error.code, error.status);
  else throw error; // invalid caller input
}
```

`chat` accepts text or 1–100 `{role, content}` messages, at most 100,000 characters per message and 500KB serialized. Roles are user, assistant and system. Options are `model`, `maxTokens` and `signal`. `routing:false` requires an explicit model. `max_quality` uses the capable model for both primary and fallback calls. `max_savings` currently follows `auto`. Default `maxTokens` is 1024; provider limits still apply. Routing is heuristic, not a quality guarantee.

HTTP errors throw `TokenSaveError` (status/provider/code); raw provider errors and credentials are excluded from messages. Invalid JSON/completion payloads also throw. One timeout spans all provider calls. Caller cancellation is supported. Only explicit transient HTTP errors (429, 500, 502, 503, 504, 529) allow fallback. Authentication/validation failures, network failures, timeouts and malformed responses do not trigger another billable request automatically. Supply `fallbackKeys: {anthropic: process.env.ANTHROPIC_API_KEY}` to opt in to sending messages to another provider. Google, Anthropic, OpenAI and Groq each have an adapter; system instructions are mapped explicitly.

The cache uses SHA-256 over a serialized structured identity including provider, a credential scope authenticated with a random per-instance HMAC secret, resolved model, quality, messages and output limit. It caches only valid primary successes. Fallbacks and errors are never stored under the primary identity. TTL expiry and a bounded FIFO entry cap prevent indefinite growth; returned completions and nested accounting metadata are cloned so caller mutations do not poison the cache. `cache:false` bypasses reads/writes and `clearCache()` removes records. Concurrent misses are independent requests; they are not deduplicated. Existing cache entries can reuse stochastic results until expiry; disable caching when freshness or independent samples matter.

Text/whitespace/code is preserved verbatim. `compression` remains accepted for configuration compatibility, but destructive compression is disabled. Previous telemetry fields (`analytics`, `analyticsUrl`, `userId`, `webhookUrl`, `tags`) are no longer used; the SDK sends no analytics or webhooks. No arbitrary provider parameters, streaming, images or tool calls are forwarded.

`getStats()` returns request/error/cache counters, at most 1000 recent latencies, known estimated USD costs, estimated avoided-repeat costs, and unknown-cost/savings counters. See [accounting](ACCOUNTING.md). Dollar totals are not invoice totals. Provider payloads remain provider-native; inspect `_tokensave.provider` after fallback before parsing their content.

Migration from 2.0: handle thrown errors rather than error-shaped success responses, copy both JS files, run server-side, accept nullable accounting fields, and stop relying on compression or analytics side effects. TypeScript declarations are in `sdk/tokensave.d.ts`.
