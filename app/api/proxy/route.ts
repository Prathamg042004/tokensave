import { NextRequest, NextResponse } from "next/server";
import { authenticate, serverError } from "@/lib/auth";
import { getRedis, parseJson, rSet, rGet, rateLimit } from "@/lib/redis";
import { bucketIdFor } from "@/lib/keys";
import { buildCacheKey, tenantOf } from "@/lib/cache";
import { deliverWebhook } from "@/lib/ssrf";

/**
 * Optimisation proxy.
 *
 * Security changes in this pass:
 *  - cache entries are namespaced per account and addressed by SHA-256 over
 *    (tenant, provider, model, quality, messages) instead of a global 32-bit
 *    hash of the prompt, which could collide into another caller's response
 *  - the rate limit bucket is derived from a verified credential or a hashed
 *    client IP, not from a caller-chosen "tsKey" string
 *  - webhooks are delivered to the endpoint registered by the account and
 *    validated by the SSRF guard, never to a URL supplied in the request
 *  - the routed model is checked against a per-provider allowlist before it
 *    reaches a provider URL, and Google credentials move to a header
 *  - provider calls are time-boxed, and upstream error text is not echoed
 */

const CACHE_TTL_SECONDS = 1800;
const RATE_LIMIT = 60;
const RATE_WINDOW_SECONDS = 60;
const MAX_BODY_SIZE = 500000;
const MAX_MESSAGE_LENGTH = 100000;
const MAX_MESSAGES = 100;
const PROVIDER_TIMEOUT_MS = 60000;

const PRICING: Record<string, [number, number]> = {
  "claude-haiku-4-5-20251001": [0.8, 4.0],
  "claude-sonnet-4-6": [3.0, 15.0],
  "claude-opus-4-8": [15.0, 75.0],
  "gpt-4o-mini": [0.15, 0.6],
  "gpt-4o": [2.5, 10.0],
  "gpt-4-turbo": [10.0, 30.0],
  "gemini-2.0-flash-lite": [0.075, 0.3],
  "gemini-2.0-flash": [0.15, 0.6],
  "gemini-1.5-pro": [1.25, 5.0],
  "llama-3.1-8b-instant": [0.05, 0.08],
  "llama-3.3-70b-versatile": [0.59, 0.79],
  "mixtral-8x7b-32768": [0.24, 0.24],
  "deepseek-r1-distill-llama-70b": [0.75, 0.99],
};

type ProviderName = "anthropic" | "openai" | "google" | "groq";

const PROVIDERS: Record<ProviderName, { simple: string; complex: string; premium: string; models: string[] }> = {
  anthropic: {
    simple: "claude-haiku-4-5-20251001",
    complex: "claude-sonnet-4-6",
    premium: "claude-opus-4-8",
    models: ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-8"],
  },
  openai: {
    simple: "gpt-4o-mini",
    complex: "gpt-4o",
    premium: "gpt-4-turbo",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
  },
  google: {
    simple: "gemini-2.0-flash-lite",
    complex: "gemini-2.0-flash",
    premium: "gemini-1.5-pro",
    models: ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-1.5-pro"],
  },
  groq: {
    simple: "llama-3.1-8b-instant",
    complex: "llama-3.3-70b-versatile",
    premium: "deepseek-r1-distill-llama-70b",
    models: [
      "llama-3.1-8b-instant",
      "llama-3.3-70b-versatile",
      "mixtral-8x7b-32768",
      "deepseek-r1-distill-llama-70b",
    ],
  },
};

const PROVIDER_NAMES = Object.keys(PROVIDERS) as ProviderName[];

type Message = { role: string; content: string };

type LogEntry = {
  userId?: string | null;
  provider?: string;
  model?: string;
  complexity?: string;
  cache_hit?: boolean;
  tokens_saved?: number;
  latency?: number;
  is_error?: boolean;
  error_code?: number;
  input_tokens?: number;
  output_tokens?: number;
  cost?: number;
  cost_saved?: number;
  fallback?: boolean;
  original_provider?: string;
  tags?: Record<string, string>;
};

function estimateTokens(text: string): number {
  return Math.ceil((text || "").length / 4);
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICING[model] || [1, 5];
  return (inputTokens * price[0] + outputTokens * price[1]) / 1000000;
}

/** Prefers the provider's own usage accounting over a character estimate. */
function outputTokensFrom(payload: unknown, fallbackText: string): number {
  const data = payload as Record<string, any>;
  const usage = data?.usage || data?.usageMetadata;
  const reported =
    usage?.output_tokens ?? usage?.completion_tokens ?? usage?.candidatesTokenCount ?? null;
  if (typeof reported === "number" && reported > 0) return reported;
  return estimateTokens(fallbackText);
}

function inputTokensFrom(payload: unknown, messages: Message[]): number {
  const data = payload as Record<string, any>;
  const usage = data?.usage || data?.usageMetadata;
  const reported = usage?.input_tokens ?? usage?.prompt_tokens ?? usage?.promptTokenCount ?? null;
  if (typeof reported === "number" && reported > 0) return reported;
  return messages.reduce((sum, message) => sum + estimateTokens(message.content), 0);
}

const COMPLEX_HINTS = [
  "analyse",
  "analyze",
  "architecture",
  "compare",
  "debug",
  "design",
  "explain why",
  "optimise",
  "optimize",
  "prove",
  "refactor",
  "step by step",
  "strategy",
  "trade-off",
  "tradeoff",
  "write code",
];

function detectComplexity(messages: Message[]): "simple" | "complex" {
  if (messages.length > 6) return "complex";

  const last = messages[messages.length - 1]?.content ?? "";
  const text = last.toLowerCase();
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  if (words > 80) return "complex";
  if (COMPLEX_HINTS.some((hint) => text.includes(hint))) return "complex";
  if (words < 15) return "simple";

  // When the signal is weak, route to the capable model.
  return "complex";
}

function pickModel(complexity: "simple" | "complex", provider: ProviderName): string {
  return complexity === "simple" ? PROVIDERS[provider].simple : PROVIDERS[provider].complex;
}

const FILLERS = [
  "to be honest with you",
  "in my humble opinion",
  "as you probably know",
  "as you may already know",
  "I would like to say that",
  "what I want to say is",
  "the thing is that",
  "at the end of the day",
  "for what it's worth",
  "needless to say",
  "it goes without saying",
  "as a matter of fact",
];

function compressPrompt(text: string): { compressed: string; savedChars: number } {
  // Never rewrite prompts that carry code: collapsing whitespace there
  // changes the meaning of the input.
  if (text.includes("\u0060\u0060\u0060")) return { compressed: text, savedChars: 0 };

  let out = text;
  for (const filler of FILLERS) {
    out = out.split(filler).join("");
    out = out.split(filler.toLowerCase()).join("");
  }
  // Collapse runs of spaces and tabs but keep line structure intact.
  out = out.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+$/gm, "").trim();

  return { compressed: out, savedChars: Math.max(0, text.length - out.length) };
}

function validateInput(body: Record<string, any>): string | null {
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return "messages array is required and must not be empty";
  }
  if (body.messages.length > MAX_MESSAGES) {
    return "Maximum " + MAX_MESSAGES + " messages allowed";
  }

  for (let i = 0; i < body.messages.length; i++) {
    const message = body.messages[i];
    if (!message || typeof message !== "object") return "messages[" + i + "] must be an object";
    if (typeof message.content !== "string") return "messages[" + i + "].content must be a string";
    if (!message.role || !["user", "assistant", "system"].includes(message.role)) {
      return "messages[" + i + "].role must be user, assistant, or system";
    }
    if (message.content.length > MAX_MESSAGE_LENGTH) {
      return "messages[" + i + "].content exceeds the 100K character limit";
    }
  }

  if (typeof body.apiKey !== "string" || body.apiKey.length < 10 || body.apiKey.length > 500) {
    return "A valid provider apiKey is required";
  }
  if (body.provider && !PROVIDER_NAMES.includes(body.provider)) {
    return "Invalid provider. Use: " + PROVIDER_NAMES.join(", ");
  }
  if (body.model !== undefined && typeof body.model !== "string") {
    return "model must be a string";
  }
  if (body.quality !== undefined && !["auto", "max_savings", "max_quality"].includes(body.quality)) {
    return "quality must be auto, max_savings or max_quality";
  }
  if (body.fallbackKeys !== undefined && (typeof body.fallbackKeys !== "object" || body.fallbackKeys === null)) {
    return "fallbackKeys must be an object";
  }
  return null;
}

/**
 * The model reaches a provider URL, so it is resolved against a fixed
 * allowlist rather than interpolated from caller input.
 */
function resolveModel(provider: ProviderName, requested: unknown, complexity: "simple" | "complex", quality: string): string {
  if (typeof requested === "string" && PROVIDERS[provider].models.includes(requested)) {
    return requested;
  }
  if (quality === "max_quality") return PROVIDERS[provider].complex;
  return pickModel(complexity, provider);
}

function buildProviderRequest(provider: ProviderName, model: string, apiKey: string, messages: Message[]) {
  if (provider === "anthropic") {
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const turns = messages.filter((m) => m.role !== "system");
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: system
        ? { model, max_tokens: 1024, system, messages: turns }
        : { model, max_tokens: 1024, messages: turns },
    };
  }

  if (provider === "openai") {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: { model, messages },
    };
  }

  if (provider === "groq") {
    return {
      url: "https://api.groq.com/openai/v1/chat/completions",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: { model, messages },
    };
  }

  // Google. The credential goes in a header so it never lands in a URL,
  // a proxy log or a referrer.
  return {
    url:
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) +
      ":generateContent",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: {
      contents: messages
        .filter((message) => message.role !== "system")
        .map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
    },
  };
}

async function callProvider(request: { url: string; headers: Record<string, string>; body: unknown }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    return { status: response.status, payload };
  } finally {
    clearTimeout(timer);
  }
}

async function logRequest(entry: LogEntry, webhookUrl: string | null): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const record = {
    ...entry,
    timestamp: Date.now(),
    id: "req_" + Date.now().toString(36) + crypto.randomUUID().slice(0, 4),
  };

  try {
    await redis.lpush("request_logs", JSON.stringify(record));
    await redis.ltrim("request_logs", 0, 999);

    const today = new Date().toISOString().split("T")[0];
    const deploymentKey = "stats:" + today;
    await redis.hincrby(deploymentKey, "total_requests", 1);
    await redis.hincrby(deploymentKey, "cache_hits", entry.cache_hit ? 1 : 0);
    await redis.hincrby(deploymentKey, "errors", entry.is_error ? 1 : 0);

    if (entry.userId) {
      const accountKey = "user_stats:" + entry.userId + ":" + today;
      await redis.hincrby(accountKey, "requests", 1);
      await redis.hincrby(accountKey, "cache_hits", entry.cache_hit ? 1 : 0);
      await redis.hincrby(accountKey, "errors", entry.is_error ? 1 : 0);
      await redis.hincrby(accountKey, "tokens_saved", entry.tokens_saved || 0);
      await redis.hincrby(accountKey, "input_tokens", entry.input_tokens || 0);
      await redis.hincrby(accountKey, "output_tokens", entry.output_tokens || 0);
      await redis.hincrby(accountKey, "cost_micro", Math.round((entry.cost || 0) * 1000000));
      await redis.hincrby(accountKey, "saved_micro", Math.round((entry.cost_saved || 0) * 1000000));
      await redis.expire(accountKey, 60 * 60 * 24 * 40);
    }

    if (entry.latency) {
      await redis.lpush("latency_log", JSON.stringify({ latency: entry.latency, timestamp: Date.now() }));
      await redis.ltrim("latency_log", 0, 99);
    }

    await redis.lpush(
      "audit_log",
      JSON.stringify({
        event: entry.is_error ? "api_error" : "api_request",
        timestamp: Date.now(),
        provider: entry.provider,
        model: entry.model,
        cache_hit: Boolean(entry.cache_hit),
        userId: entry.userId ?? null,
      })
    );
    await redis.ltrim("audit_log", 0, 999);
  } catch {
    /* telemetry must never break a request */
  }

  if (webhookUrl) {
    // Validated destination, no redirects, time-boxed.
    void deliverWebhook(webhookUrl, { event: "request_completed", data: record });
  }
}

async function registeredWebhookFor(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const stored = parseJson<{ url?: string; active?: boolean }>(await rGet("webhook:" + userId));
  if (!stored?.url || stored.active === false) return null;
  return stored.url;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Request too large. Maximum 500KB." }, { status: 413 });
    }

    let body: Record<string, any>;
    try {
      body = (await req.json()) as Record<string, any>;
    } catch {
      return NextResponse.json({ error: "A JSON body is required" }, { status: 400 });
    }

    const validationError = validateInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // A tsKey, when present, must be a real credential. Previously any string
    // was accepted and simply became the rate limit bucket, so the limit could
    // be reset at will and requests could be attributed to another account.
    const identity = await authenticate(req);
    let caller = identity;
    if (!caller && typeof body.tsKey === "string" && body.tsKey.length > 0) {
      const { verifyApiKey } = await import("@/lib/auth");
      caller = await verifyApiKey(body.tsKey);
      if (!caller) {
        return NextResponse.json({ error: "Invalid TokenSave key" }, { status: 401 });
      }
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const bucket = caller ? "account:" + caller.userId : "ip:" + (await bucketIdFor(clientIp));
    const limit = await rateLimit("proxy:" + bucket, RATE_LIMIT, RATE_WINDOW_SECONDS);

    const rateHeaders = {
      "X-RateLimit-Limit": String(RATE_LIMIT),
      "X-RateLimit-Remaining": String(limit.remaining),
    };

    if (!limit.allowed) {
      await logRequest(
        { is_error: true, provider: body.provider, latency: Date.now() - startedAt, userId: caller?.userId ?? null },
        null
      );
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum " + RATE_LIMIT + " requests per minute." },
        { status: 429, headers: { ...rateHeaders, "Retry-After": String(RATE_WINDOW_SECONDS) } }
      );
    }

    const provider: ProviderName = (body.provider as ProviderName) || "anthropic";
    const quality: string = body.quality || "auto";
    const apiKey: string = body.apiKey;
    const webhookUrl = await registeredWebhookFor(caller?.userId ?? null);

    const cleanTags: Record<string, string> = {};
    if (body.tags && typeof body.tags === "object") {
      for (const [key, value] of Object.entries(body.tags).slice(0, 20)) {
        if (typeof key === "string" && typeof value === "string") {
          cleanTags[key.slice(0, 50)] = value.slice(0, 200);
        }
      }
    }

    const cleanMessages: Message[] = (body.messages as Message[]).map((message) => ({
      role: message.role,
      content: message.content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""),
    }));

    const complexity = detectComplexity(cleanMessages);
    const model = resolveModel(provider, body.model, complexity, quality);

    const tenant = tenantOf(caller);
    const cacheKey = await buildCacheKey({ tenant, provider, model, quality, messages: cleanMessages });
    const cached = await rGet<unknown>(cacheKey);

    if (cached) {
      const cachedPayload = typeof cached === "string" ? JSON.parse(cached) : cached;
      const latency = Date.now() - startedAt;
      const savedTokens = outputTokensFrom(cachedPayload, JSON.stringify(cachedPayload));

      await logRequest(
        {
          cache_hit: true,
          tokens_saved: savedTokens,
          provider,
          model,
          latency,
          userId: caller?.userId ?? null,
          tags: cleanTags,
          is_error: false,
          cost: 0,
          cost_saved: calculateCost(model, 0, savedTokens),
        },
        webhookUrl
      );

      return NextResponse.json(
        {
          ...cachedPayload,
          tokensave_meta: {
            request_id: "req_" + Date.now().toString(36),
            cache_hit: true,
            model_used: model,
            method: "cache",
            quality_mode: quality,
            latency_ms: latency,
            cost: 0,
            tokens_saved: savedTokens,
            tags: cleanTags,
          },
        },
        { headers: rateHeaders }
      );
    }

    let optimisedMessages = cleanMessages;
    let savedChars = 0;
    if (quality !== "max_quality" && cleanMessages.length > 0) {
      const last = cleanMessages[cleanMessages.length - 1];
      const result = compressPrompt(last.content);
      savedChars = result.savedChars;
      if (savedChars > 0) {
        optimisedMessages = [...cleanMessages.slice(0, -1), { ...last, content: result.compressed }];
      }
    }

    const primary = await callProvider(buildProviderRequest(provider, model, apiKey, optimisedMessages));

    if (primary.status >= 400) {
      const upstream = primary.payload as Record<string, any>;
      const upstreamMessage = String(upstream?.error?.message || "");
      const isRateLimited =
        primary.status === 429 || /rate|quota|limit|exhausted/i.test(upstreamMessage);

      if (isRateLimited && body.fallbackKeys && typeof body.fallbackKeys === "object") {
        for (const candidate of PROVIDER_NAMES.filter((name) => name !== provider)) {
          const fallbackKey = (body.fallbackKeys as Record<string, unknown>)[candidate];
          if (typeof fallbackKey !== "string" || fallbackKey.length < 10) continue;

          const fallbackModel = pickModel(complexity, candidate);
          let fallback;
          try {
            fallback = await callProvider(
              buildProviderRequest(candidate, fallbackModel, fallbackKey, optimisedMessages)
            );
          } catch {
            continue;
          }
          if (fallback.status >= 400) continue;

          const latency = Date.now() - startedAt;
          const inputTokens = inputTokensFrom(fallback.payload, optimisedMessages);
          const outputTokens = outputTokensFrom(fallback.payload, JSON.stringify(fallback.payload));
          const cost = calculateCost(fallbackModel, inputTokens, outputTokens);
          const premiumCost = calculateCost(PROVIDERS[candidate].premium, inputTokens, outputTokens);

          const fallbackCacheKey = await buildCacheKey({
            tenant,
            provider: candidate,
            model: fallbackModel,
            quality,
            messages: cleanMessages,
          });
          await rSet(fallbackCacheKey, fallback.payload, CACHE_TTL_SECONDS);

          await logRequest(
            {
              cache_hit: false,
              tokens_saved: savedChars,
              provider: candidate,
              model: fallbackModel,
              complexity,
              latency,
              userId: caller?.userId ?? null,
              tags: cleanTags,
              is_error: false,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              cost,
              cost_saved: Math.max(0, premiumCost - cost),
              fallback: true,
              original_provider: provider,
            },
            webhookUrl
          );

          return NextResponse.json(
            {
              ...(fallback.payload as object),
              tokensave_meta: {
                request_id: "req_" + Date.now().toString(36),
                cache_hit: false,
                model_used: fallbackModel,
                complexity,
                chars_saved: savedChars,
                quality_mode: quality,
                method: "fallback",
                latency_ms: latency,
                original_provider: provider,
                fallback_provider: candidate,
                cost,
                cost_without_optimization: premiumCost,
                input_tokens: inputTokens,
                output_tokens: outputTokens,
                tags: cleanTags,
              },
            },
            { headers: rateHeaders }
          );
        }
      }

      await logRequest(
        {
          is_error: true,
          error_code: primary.status,
          provider,
          model,
          latency: Date.now() - startedAt,
          userId: caller?.userId ?? null,
          tags: cleanTags,
        },
        webhookUrl
      );

      // The upstream body can carry account identifiers, so only the status
      // and a stable summary are returned.
      return NextResponse.json(
        {
          error: "The upstream provider rejected this request",
          provider,
          upstream_status: primary.status,
        },
        { status: primary.status === 429 ? 429 : 502, headers: rateHeaders }
      );
    }

    const latency = Date.now() - startedAt;
    const inputTokens = inputTokensFrom(primary.payload, optimisedMessages);
    const outputTokens = outputTokensFrom(primary.payload, JSON.stringify(primary.payload));
    const cost = calculateCost(model, inputTokens, outputTokens);
    const premiumCost = calculateCost(PROVIDERS[provider].premium, inputTokens, outputTokens);

    await rSet(cacheKey, primary.payload, CACHE_TTL_SECONDS);

    await logRequest(
      {
        cache_hit: false,
        tokens_saved: savedChars,
        provider,
        model,
        complexity,
        latency,
        userId: caller?.userId ?? null,
        tags: cleanTags,
        is_error: false,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost,
        cost_saved: Math.max(0, premiumCost - cost),
      },
      webhookUrl
    );

    return NextResponse.json(
      {
        ...(primary.payload as object),
        tokensave_meta: {
          request_id: "req_" + Date.now().toString(36),
          cache_hit: false,
          model_used: model,
          complexity,
          chars_saved: savedChars,
          quality_mode: quality,
          method: "direct",
          latency_ms: latency,
          cost,
          cost_without_optimization: premiumCost,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          tags: cleanTags,
        },
      },
      { headers: rateHeaders }
    );
  } catch (error) {
    return serverError("proxy", error);
  }
}

export async function GET() {
  return NextResponse.json({
    service: "TokenSave Proxy",
    method: "POST",
    authentication: "Optional Bearer credential. Anonymous callers share a cache namespace and an IP rate limit.",
    providers: PROVIDER_NAMES,
  });
}
