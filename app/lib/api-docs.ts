// Describes the current route implementation, not future plan entitlements.
export const API_BASE = "https://www.tokensave.in";
export const proxyFields = [
  [
    "messages",
    "array · required",
    "1–100 messages. Each needs role (user, assistant or system) and non-empty string content, at most 100,000 characters per message. Provider-specific role restrictions still apply.",
  ],
  [
    "apiKey",
    "string · required",
    "Your selected provider credential, 10–500 characters. Sent in the JSON body; keep it in server environment variables.",
  ],
  [
    "provider",
    "string · optional",
    "anthropic (default), openai, google or groq.",
  ],
  [
    "tsKey",
    "string · optional",
    "Used as the rate-limit bucket identifier; otherwise the client IP is used. It is not validated as an authentication credential by this route and does not activate a paid plan.",
  ],
  [
    "model",
    "string · optional",
    "Overrides automatic model selection. The provider validates availability. Other optimization steps still apply; this is not a cache bypass.",
  ],
  [
    "quality",
    "string · optional",
    "auto (default), max_savings or max_quality. max_savings currently follows auto. max_quality skips compression and selects the capable model unless model is supplied; cache lookup happens first.",
  ],
  [
    "fallbackKeys",
    "object · optional",
    "Provider-name → credential mapping. Only supplied providers are attempted for eligible rate/quota failures, in groq → anthropic → openai → google order, excluding the primary.",
  ],
  [
    "tags",
    "object · optional",
    "String values only. First 20 entries considered; keys truncated to 50 and values to 200 characters. Recorded in metadata; avoid private information.",
  ],
  [
    "userId",
    "string · optional",
    "Caller-supplied analytics identifier. Does not authenticate a user or establish tenant isolation.",
  ],
  [
    "webhookUrl",
    "string · optional",
    "Best-effort POST of request_completed and request metadata. No signature, retry or guaranteed delivery. Use only an endpoint you control; omit during initial evaluation.",
  ],
] as const;
export const routingModels = [
  ["anthropic", "claude-haiku-4-5-20251001", "claude-sonnet-4-6"],
  ["openai", "gpt-4o-mini", "gpt-4o"],
  ["google", "gemini-2.0-flash-lite", "gemini-2.0-flash"],
  ["groq", "llama-3.1-8b-instant", "llama-3.3-70b-versatile"],
] as const;
export const javascriptExample = `// Node.js 20+ / server only. Never expose these keys in client code.
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("Set OPENAI_API_KEY on your server");
const response = await fetch("${API_BASE}/api/proxy", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  signal: AbortSignal.timeout(30000),
  body: JSON.stringify({
    provider: "openai",
    apiKey,
    ...(process.env.TOKENSAVE_KEY ? { tsKey: process.env.TOKENSAVE_KEY } : {}),
    messages: [{ role: "user", content: "What is the capital of Japan?" }],
    quality: "auto"
  })
});
const data = await response.json();
if (!response.ok) {
  // Do not log request bodies, credentials or private provider errors.
  throw new Error("TokenSave HTTP " + response.status);
}
// This example selects OpenAI. Other providers have different response shapes.
console.log(data.choices?.[0]?.message?.content);
console.log(data.tokensave_meta);`;
export const pythonExample = `# Server only. Install dependency: python -m pip install requests
import os
import requests

response = requests.post(
    "${API_BASE}/api/proxy",
    headers={"Content-Type": "application/json"},
    json={
        "provider": "openai",
        "apiKey": os.environ["OPENAI_API_KEY"],
        "messages": [{"role": "user", "content": "What is the capital of Japan?"}],
        "quality": "auto"
    },
    timeout=30
)
response.raise_for_status()
data = response.json()
print(data.get("choices", [{}])[0].get("message", {}).get("content"))
print(data.get("tokensave_meta"))`;
export const curlExample = `# Requires curl, jq and OPENAI_API_KEY in your server environment.
# jq encodes the credential safely; avoid shell tracing (set -x).
jq -n --arg key "$OPENAI_API_KEY" '{
  provider: "openai",
  apiKey: $key,
  messages: [{role: "user", content: "What is the capital of Japan?"}],
  quality: "auto"
}' | curl --silent --show-error --fail-with-body --max-time 30 \\
  "${API_BASE}/api/proxy" \\
  -H "Content-Type: application/json" --data-binary @-`;
export type Endpoint = {
  id: string;
  method: string;
  path: string;
  title: string;
  description: string;
  fields: readonly (readonly string[])[];
  request?: string;
  response: string;
  caveat?: string;
  responses?: { name: string; status: number; body: Record<string, unknown> }[];
};
export const endpoints: Endpoint[] = [
  {
    id: "proxy",
    method: "POST",
    path: "/api/proxy",
    title: "Optimize a text request",
    description:
      "Returns the selected provider's JSON payload with tokensave_meta. Responses are not normalized across providers. No streaming, images, tools or arbitrary provider options are forwarded.",
    fields: proxyFields,
    request: JSON.stringify(
      {
        provider: "openai",
        apiKey: "YOUR_PROVIDER_KEY",
        messages: [{ role: "user", content: "What is the capital of Japan?" }],
        quality: "auto",
      },
      null,
      2,
    ),
    response: JSON.stringify(
      {
        choices: [{ message: { role: "assistant", content: "Tokyo." } }],
        tokensave_meta: {
          request_id: "req_example",
          cache_hit: false,
          model_used: "gpt-4o-mini",
          complexity: "simple",
          chars_saved: 0,
          quality_mode: "auto",
          latency_ms: 420,
          method: "routed_to_cheap",
          cost: 0.000003,
          cost_without_optimization: 0.00005,
          savings_percent: 94,
          input_tokens: 8,
          output_tokens: 3,
          tags: {},
        },
      },
      null,
      2,
    ),
    caveat:
      "Illustrative values only. Cost and token metadata are estimates; the expensive-model comparison is not a measured direct-provider baseline. Cache-hit metadata has a different shape and may omit model_used, complexity and token counts.",
  },
  {
    id: "batch",
    method: "POST",
    path: "/api/batch",
    title: "Process a batch",
    description:
      "Processes prompts sequentially through the proxy. This is a synchronous response, not a background job or a provider Batch API discount.",
    fields: [
      [
        "prompts",
        "array · required",
        "1–50 strings, or objects with content. Use non-empty strings.",
      ],
      ["apiKey", "string · required", "Provider credential."],
      [
        "provider",
        "string · optional",
        "anthropic by default; same provider identifiers as proxy.",
      ],
    ],
    request: JSON.stringify(
      {
        provider: "openai",
        apiKey: "YOUR_PROVIDER_KEY",
        prompts: ["What is 2+2?"],
      },
      null,
      2,
    ),
    response: JSON.stringify(
      {
        batch_id: "batch_example",
        total: 1,
        successful: 1,
        cached: 0,
        processing_time_ms: 900,
        results: [
          {
            prompt: "What is 2+2?",
            status: "success",
            response: { choices: [{ message: { content: "4" } }] },
          },
        ],
      },
      null,
      2,
    ),
    caveat:
      "Inspect every response.error and response.tokensave_meta.is_error: the current batch handler can label an upstream HTTP error as success. tsKey, model, quality, tags and fallbackKeys are not forwarded. It currently calls the legacy tokensave.vercel.app proxy host; evaluate this limitation before adopting batch.",
  },
  {
    id: "trim-context",
    method: "POST",
    path: "/api/trim-context",
    title: "Trim conversation history",
    description:
      "Keeps system messages and the final message, then fits earlier non-system messages from newest to oldest. Returns messages; it does not call an AI provider.",
    fields: [
      [
        "messages",
        "array · required",
        "Use valid text messages, ending with the latest user message.",
      ],
      [
        "maxTokens",
        "number · optional",
        "Default 4000. Supply a positive integer; estimate uses ceil(characters / 4) per message.",
      ],
    ],
    request: JSON.stringify(
      {
        messages: [
          { role: "system", content: "Be concise." },
          { role: "user", content: "Hello" },
        ],
        maxTokens: 4000,
      },
      null,
      2,
    ),
    response: JSON.stringify(
      {
        original_messages: 2,
        trimmed_messages: 2,
        messages_removed: 0,
        original_tokens: 5,
        final_tokens: 5,
        tokens_saved: 0,
        trimmed: [
          { role: "system", content: "Be concise." },
          { role: "user", content: "Hello" },
        ],
      },
      null,
      2,
    ),
    caveat:
      "A target, not a strict token ceiling: retained system/final messages may already exceed it. Counts are estimates, not a model tokenizer. Recheck output before sending it onward.",
  },
  {
    id: "smart-context",
    method: "POST",
    path: "/api/smart-context",
    title: "Summarize older messages",
    description:
      "Uses deterministic text extraction, not an LLM: collects recent topic snippets, decision phrases and a small code block from older messages. Keeps system messages and recent conversation turns.",
    fields: [
      [
        "messages",
        "non-empty array · required",
        "Text messages with role and content.",
      ],
      [
        "maxTokens",
        "number · optional",
        "Default 4000. Positive integer; triggers summarization when estimated input exceeds the target.",
      ],
      [
        "keepRecent",
        "number · optional",
        "Default 6. Use a positive integer for recent non-system messages to preserve.",
      ],
    ],
    request: JSON.stringify(
      {
        messages: [{ role: "user", content: "Hello" }],
        maxTokens: 4000,
        keepRecent: 6,
      },
      null,
      2,
    ),
    response: JSON.stringify(
      {
        optimized: false,
        reason: "Already within token limit",
        original_tokens: 2,
        final_tokens: 2,
        tokens_saved: 0,
        percent_saved: 0,
        messages: [{ role: "user", content: "Hello" }],
      },
      null,
      2,
    ),
    caveat:
      "On optimization returns optimized:true, original_messages, optimized_messages, messages_summarized, messages_kept, token estimates, percent_saved and messages. Summary may lose details, exceed the target or even increase tokens. No fixed savings or quality guarantee.",
  },
  {
    id: "health",
    method: "GET",
    path: "/api/health",
    title: "Check infrastructure",
    description:
      "Checks server/Redis availability. A passing response does not test authentication, billing or provider generation.",
    fields: [],
    response: JSON.stringify(
      {
        status: "healthy",
        timestamp: "2026-10-21T08:00:00.000Z",
        version: "3.1.0",
        services: {
          redis: { status: "connected", latency_ms: 12 },
          proxy: { status: "running" },
        },
      },
      null,
      2,
    ),
    responses: [
      {
        name: "Redis not configured",
        status: 503,
        body: {
          status: "degraded",
          timestamp: "2026-10-21T08:00:00.000Z",
          version: "3.1.0",
          services: {
            redis: { status: "not_configured" },
            proxy: { status: "running" },
          },
        },
      },
    ],
  },
  {
    id: "discovery",
    method: "GET",
    path: "/api/proxy",
    title: "Discover proxy capabilities",
    description:
      "Lists API version, provider identifiers, models and endpoint links. Treat this page's limitations as part of the integration guide; discovery descriptions may be broader than implemented behavior.",
    fields: [],
    response: JSON.stringify(
      {
        status: "active",
        service: "TokenSave API Proxy",
        version: "3.1.0",
        providers: ["anthropic", "openai", "google", "groq"],
        rate_limit: "60 requests/minute",
      },
      null,
      2,
    ),
    caveat:
      "Discovery example shows selected fields. The actual response also includes configured model IDs, endpoint URLs, quality-mode descriptions and feature descriptions. It is not a verified runtime capability test.",
  },
];
export const internalEndpoints = [
  [
    "GET /api/stats",
    "Dashboard metrics",
    "Service-wide seven-day aggregates, recent logs and performance estimates; not isolated customer billing.",
  ],
  [
    "GET /api/audit",
    "Audit list",
    "Requires a Bearer ts_live_ prefix in the current handler; this is not verified ownership or tenant-scoped authorization.",
  ],
  [
    "POST /api/generate-key",
    "Key management",
    "Caller-supplied userId, optional email and action: rotate. Not a supported external authentication boundary.",
  ],
  [
    "GET/POST /api/teams",
    "Team management",
    "create, invite, remove and get actions; identity/role authorization needs review before production use.",
  ],
  [
    "GET/POST /api/webhooks",
    "Webhook configuration",
    "Stores configuration or sends test events. Stored subscriptions do not establish guaranteed delivery; the proxy uses its request-level webhookUrl.",
  ],
  [
    "GET/POST /api/analytics",
    "SDK counters",
    "Receives requests, cacheHits and tokensSaved counts. Counters are not provider invoices or independently verified usage.",
  ],
  [
    "GET /api/batch, /api/trim-context, /api/smart-context",
    "Discovery",
    "Read-only endpoint usage descriptions. They do not execute optimization.",
  ],
] as const;

const proxyEndpoint = endpoints.find((e) => e.id === "proxy")!;
proxyEndpoint.responses = [
  {
    name: "Cache hit",
    status: 200,
    body: {
      choices: [{ message: { role: "assistant", content: "Tokyo." } }],
      tokensave_meta: {
        request_id: "req_cache_example",
        cache_hit: true,
        tokens_saved: "100%",
        method: "cache",
        quality_mode: "auto",
        latency_ms: 12,
        cost: 0,
        tags: {},
      },
    },
  },
  {
    name: "Fallback to Groq",
    status: 200,
    body: {
      choices: [{ message: { role: "assistant", content: "Tokyo." } }],
      tokensave_meta: {
        request_id: "req_fallback_example",
        cache_hit: false,
        model_used: "llama-3.1-8b-instant",
        complexity: "simple",
        chars_saved: 0,
        quality_mode: "auto",
        method: "fallback",
        latency_ms: 900,
        original_provider: "openai",
        fallback_provider: "groq",
        cost: 0.000001,
        cost_without_optimization: 0.00001,
        savings_percent: 90,
        input_tokens: 8,
        output_tokens: 3,
        tags: {},
      },
    },
  },
  {
    name: "Validation error",
    status: 400,
    body: { error: "messages array is required and must not be empty" },
  },
  {
    name: "Declared body too large (middleware)",
    status: 413,
    body: {
      error: { message: "Request body too large. Maximum 500KB.", code: 413 },
    },
  },
  {
    name: "Proxy rate limit",
    status: 429,
    body: { error: "Rate limit exceeded. Maximum 60 requests per minute." },
  },
  {
    name: "Upstream authentication failure",
    status: 401,
    body: {
      error: { message: "Invalid API key", type: "invalid_request_error" },
      tokensave_meta: {
        request_id: "req_error_example",
        cache_hit: false,
        model_used: "gpt-4o-mini",
        complexity: "simple",
        chars_saved: 0,
        quality_mode: "auto",
        latency_ms: 200,
        is_error: true,
        tags: {},
        note: "Error from openai.",
      },
    },
  },
  {
    name: "Unexpected proxy failure",
    status: 500,
    body: { error: "TokenSave proxy error: Example transport failure" },
  },
];
