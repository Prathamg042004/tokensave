import { createHash, randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getRedis, requireApiKey } from "@/app/lib/auth";
import { safeWebhookUrl } from "@/app/lib/net";

// Redis connection, shared with the rest of the API.
const redis = getRedis();

// Constants
const CACHE_TTL = 1800;
const RATE_LIMIT = 60;
const RATE_WINDOW = 60;
const MAX_BODY_SIZE = 500000;
const MAX_MESSAGE_LENGTH = 100000;
const MAX_MESSAGES = 100;
const PROVIDER_TIMEOUT = 30000;
const WEBHOOK_TIMEOUT = 5000;

// Model pricing per million tokens [input, output]
const PRICING: Record<string, [number, number]> = {
  "claude-haiku-4-5-20251001": [0.80, 4.00],
  "claude-sonnet-4-6": [3.00, 15.00],
  "claude-opus-4-8": [15.00, 75.00],
  "gpt-4o-mini": [0.15, 0.60],
  "gpt-4o": [2.50, 10.00],
  "gpt-4-turbo": [10.00, 30.00],
  "gemini-2.0-flash-lite": [0.075, 0.30],
  "gemini-2.0-flash": [0.15, 0.60],
  "gemini-1.5-pro": [1.25, 5.00],
  "llama-3.1-8b-instant": [0.05, 0.08],
  "llama-3.3-70b-versatile": [0.59, 0.79],
  "mixtral-8x7b-32768": [0.24, 0.24],
  "deepseek-r1-distill-llama-70b": [0.75, 0.99],
};

// Safe Redis operations
async function rGet(key: string): Promise<any> {
  if (!redis) return null;
  try { return await redis.get(key); } catch { return null; }
}

async function rSet(key: string, value: any, ttl: number): Promise<void> {
  if (!redis) return;
  try { await redis.setex(key, ttl, JSON.stringify(value)); } catch {}
}

async function rIncr(key: string): Promise<number> {
  if (!redis) return 0;
  try { return await redis.incr(key); } catch { return 0; }
}

async function rExpire(key: string, seconds: number): Promise<void> {
  if (!redis) return;
  try { await redis.expire(key, seconds); } catch {}
}

/**
 * The webhook target for an account, or null when there is nothing safe to call.
  *
   * The URL is always read from the account's registered configuration and
    * screened again on the way out. It is never taken from the request body:
     * that let any caller point the platform at an address of their choosing.
      */
async function registeredWebhookUrl(userId: string): Promise<string | null> {
    const raw = await rGet("webhook:" + userId);
    if (!raw) return null;
    try {
          const config = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (!config || config.active === false) return null;
          return safeWebhookUrl(config.url)?.toString() || null;
    } catch {
          return null;
    }
}

async function logRequest(data: any): Promise<void> {
  if (!redis) return;
  try {
    const entry = { ...data, timestamp: Date.now(), id: "req_" + randomUUID() };
    await redis.lpush("request_logs", JSON.stringify(entry));
    await redis.ltrim("request_logs", 0, 999);

    const today = new Date().toISOString().split("T")[0];
    const key = "stats:" + today;
    await redis.hincrby(key, "total_requests", 1);
    await redis.hincrby(key, "tokens_saved", data.tokens_saved || 0);
    await redis.hincrby(key, "cache_hits", data.cache_hit ? 1 : 0);
    await redis.hincrby(key, "total_input_tokens", data.input_tokens || 0);
    await redis.hincrby(key, "total_output_tokens", data.output_tokens || 0);
    await redis.hincrby(key, "errors", data.is_error ? 1 : 0);

    if (data.latency) {
      await redis.lpush("latency_log", JSON.stringify({ latency: data.latency, timestamp: Date.now() }));
      await redis.ltrim("latency_log", 0, 99);
    }

    const costMicro = Math.round((data.cost || 0) * 1000000);
    if (costMicro > 0) await redis.hincrby(key, "total_cost_micro", costMicro);
    const savedMicro = Math.round((data.cost_saved || 0) * 1000000);
    if (savedMicro > 0) await redis.hincrby(key, "total_saved_micro", savedMicro);

    if (data.userId) {
      const userKey = "user_stats:" + data.userId + ":" + today;
      await redis.hincrby(userKey, "requests", 1);
      await redis.hincrby(userKey, "tokens_saved", data.tokens_saved || 0);
    }

    // Audit log
    await redis.lpush("audit_log", JSON.stringify({
      event: data.is_error ? "api_error" : "api_request",
      timestamp: Date.now(),
      provider: data.provider,
      model: data.model,
      cache_hit: data.cache_hit,
      userId: data.userId,
    }));
    await redis.ltrim("audit_log", 0, 999);

    // Webhook
    if (data.webhookUrl) {
      fetch(data.webhookUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "request_completed", data: entry }),
      }).catch(() => {});
    }
  } catch {}
}

// Helpers
function estimateTokens(text: string): number {
  return Math.ceil((text || "").length / 4);
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] || [1, 5];
  return (inputTokens * p[0] + outputTokens * p[1]) / 1000000;
}

function getExpensiveModel(provider: string): string {
  if (provider === "anthropic") return "claude-sonnet-4-6";
  if (provider === "openai") return "gpt-4o";
  if (provider === "groq") return "llama-3.3-70b-versatile";
  return "gemini-2.0-flash";
}

function detectComplexity(messages: any[]): "simple" | "complex" {
  const last = messages[messages.length - 1]?.content || "";
  const words = last.split(" ").length;
  const lower = last.toLowerCase();

  const complexSignals = [
    "analyze", "code", "debug", "write a function", "explain in detail",
    "compare", "evaluate", "create a", "build", "design", "implement",
    "refactor", "optimize", "algorithm", "architecture", "why does",
    "how does", "implications", "pros and cons", "step by step",
    "comprehensive", "write a program", "fix this", "review this",
    "strategy", "philosophical", "mathematical", "write an essay",
    "system design",
  ];

  const simpleSignals = [
    "what is the capital", "what is the population", "define ",
    "translate this", "what time", "convert ", "how many",
    "what year", "who is the", "yes or no", "true or false",
  ];

  // Code syntax = always complex
  if (last.includes("```") || last.includes("function ") || last.includes("def ") ||
      last.includes("class ") || last.includes("import ") || last.includes("{") ||
      last.includes("=>") || last.includes("SELECT ")) return "complex";

  // Long conversations = complex
  if (messages.length > 6) return "complex";

  // Keyword detection
  if (complexSignals.some(k => lower.includes(k))) return "complex";
  if (simpleSignals.some(k => lower.includes(k)) && words < 15) return "simple";

  // Length-based
  if (words > 80) return "complex";
  if (words < 10) return "simple";

  // Default: when unsure, protect quality
  return words < 25 ? "simple" : "complex";
}

function pickModel(complexity: "simple" | "complex", provider: string): string {
  if (provider === "anthropic") return complexity === "simple" ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-6";
  if (provider === "openai") return complexity === "simple" ? "gpt-4o-mini" : "gpt-4o";
  if (provider === "groq") return complexity === "simple" ? "llama-3.1-8b-instant" : "llama-3.3-70b-versatile";
  return complexity === "simple" ? "gemini-2.0-flash-lite" : "gemini-2.0-flash";
}

function compressPrompt(text: string): { compressed: string; savedChars: number } {
  if (text.length < 50) return { compressed: text, savedChars: 0 };

  let c = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const fillers = [
    "to be honest with you", "in my humble opinion", "as you probably know",
    "as you may already know", "I would like to say that", "what I want to say is",
    "the thing is that", "at the end of the day", "for what it's worth",
    "needless to say", "it goes without saying", "as a matter of fact",
  ];
  for (const f of fillers) c = c.replace(new RegExp(f, "gi"), "");
  c = c.replace(/\s+/g, " ").trim();

  return { compressed: c, savedChars: text.length - c.length };
}

function getCacheKey(userId: string, messages: any[]): string {
  const raw = messages.map((m: any) => m.role + ":" + m.content).join("|");
  // Namespaced per account and hashed with SHA-256. The old 32-bit hash lived in
  // one global namespace, so two accounts could collide and read each other's
  // completions straight out of the cache.
  const digest = createHash("sha256").update(userId + "::" + raw).digest("hex");
  return "cache:" + userId + ":" + digest;
}

// Input validation
function validateInput(body: any): string | null {
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return "messages array is required and must not be empty";
  }
  if (body.messages.length > MAX_MESSAGES) {
    return "Maximum " + MAX_MESSAGES + " messages allowed";
  }
  for (let i = 0; i < body.messages.length; i++) {
    const msg = body.messages[i];
    if (!msg.role || !msg.content) return "messages[" + i + "] must have role and content";
    if (!["user", "assistant", "system"].includes(msg.role)) return "messages[" + i + "].role must be user, assistant, or system";
    if (typeof msg.content !== "string") return "messages[" + i + "].content must be a string";
    if (msg.content.length > MAX_MESSAGE_LENGTH) return "messages[" + i + "].content exceeds 100K character limit";
  }
  if (!body.apiKey || typeof body.apiKey !== "string" || body.apiKey.length < 10) {
    return "A valid apiKey is required";
  }
  if (body.apiKey.length > 500) return "apiKey is too long";
  const validProviders = ["anthropic", "openai", "google", "groq"];
  if (body.provider && !validProviders.includes(body.provider)) {
    return "Invalid provider. Use: " + validProviders.join(", ");
  }
  return null;
}

// Build provider request
function buildProviderRequest(provider: string, model: string, apiKey: string, messages: any[]): { url: string; headers: any; body: any } {
  if (provider === "anthropic") {
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: { model, max_tokens: 1024, messages },
    };
  }
  if (provider === "openai") {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
      body: { model, messages },
    };
  }
  if (provider === "groq") {
    return {
      url: "https://api.groq.com/openai/v1/chat/completions",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
      body: { model, messages },
    };
  }
  // Google
  return {
    url: "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey,
    headers: { "Content-Type": "application/json" },
    body: { contents: messages.map((m: any) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })) },
  };
}

// POST handler
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  // Every call is tied to a verified TokenSave key. The route used to relay to
  // the providers for anyone who found the URL, and it trusted body.userId and
  // body.tsKey, so a caller could bill another account and pick its own rate
  // limit bucket.
  const auth = await requireApiKey(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const userId = auth.auth.userId;

  try {
    // Request size check
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Request too large. Maximum 500KB." }, { status: 413 });
    }

    const body = await req.json();

    const validationError = validateInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    const {
      messages,
      provider = "anthropic",
      apiKey,
      model: requestedModel,
      quality = "auto",
      fallbackKeys = {},
      tags = {},
    } = body;
    
    // The webhook target comes from the account's registered configuration,
    // never from the request body.
    const webhookUrl = await registeredWebhookUrl(userId);
    
    // Rate limiting is bucketed by the verified key. A caller used to be able
    // to choose its own bucket by sending any tsKey, or to share one by IP.
    const rateLimitId = auth.auth.keyHash;
    const rlCount = await rIncr("rl:" + rateLimitId);
    if (rlCount === 1) await rExpire("rl:" + rateLimitId, RATE_WINDOW);

    if (rlCount > RATE_LIMIT) {
      await logRequest({ is_error: true, provider, latency: Date.now() - startTime, userId, error_message: "Rate limit exceeded" });
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum " + RATE_LIMIT + " requests per minute." },
        { status: 429, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Limit": String(RATE_LIMIT), "Retry-After": String(RATE_WINDOW) } }
      );
    }

    // Sanitize tags
    const cleanTags: Record<string, string> = {};
    if (tags && typeof tags === "object") {
      for (const [k, v] of Object.entries(tags).slice(0, 20)) {
        if (typeof k === "string" && typeof v === "string") {
          cleanTags[k.slice(0, 50)] = String(v).slice(0, 200);
        }
      }
    }

    // Strip control characters from messages
    const cleanMessages = messages.map((m: any) => ({
      role: m.role,
      content: m.content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""),
    }));

    // Check cache
    const cacheKey = getCacheKey(userId, cleanMessages);
    const cached = await rGet(cacheKey);

    if (cached) {
      const latency = Date.now() - startTime;
      await logRequest({ cache_hit: true, tokens_saved: 500, provider, model: "cached", latency, userId, tags: cleanTags, is_error: false, cost: 0, cost_saved: 0.001, webhookUrl });
      const cachedData = typeof cached === "string" ? JSON.parse(cached) : cached;
      return NextResponse.json({
        ...cachedData,
        tokensave_meta: {
          request_id: "req_" + randomUUID(),
          cache_hit: true,
          tokens_saved: "100%",
          method: "cache",
          quality_mode: quality,
          latency_ms: latency,
          cost: 0,
          tags: cleanTags,
        },
      }, {
        headers: { "X-RateLimit-Remaining": String(Math.max(0, RATE_LIMIT - rlCount)), "X-RateLimit-Limit": String(RATE_LIMIT) },
      });
    }

    // Detect complexity and pick model
    const complexity = detectComplexity(cleanMessages);
    const model = requestedModel || (quality === "max_quality" ? pickModel("complex", provider) : pickModel(complexity, provider));

    // Compress prompt
    let optimizedMessages = cleanMessages;
    let savedChars = 0;
    if (quality !== "max_quality") {
      const lastMsg = cleanMessages[cleanMessages.length - 1];
      const result = compressPrompt(lastMsg.content);
      savedChars = result.savedChars;
      if (savedChars > 0) {
        optimizedMessages = [...cleanMessages.slice(0, -1), { ...lastMsg, content: result.compressed }];
      }
    }

    const inputTokens = optimizedMessages.reduce((sum: number, m: any) => sum + estimateTokens(m.content), 0);

    // Build and send request
    const { url: apiUrl, headers, body: apiBody } = buildProviderRequest(provider, model, apiKey, optimizedMessages);
    const aiResponse = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify(apiBody), signal: AbortSignal.timeout(PROVIDER_TIMEOUT) });
    const aiData = await aiResponse.json();
    const latency = Date.now() - startTime;

    // Handle provider errors
    if (aiResponse.status >= 400) {
      const isRateLimit = aiResponse.status === 429 ||
        (aiData.error?.message || "").toLowerCase().match(/rate|quota|limit|exhausted/);

      // Try fallback if rate limited
      if (isRateLimit) {
        const fallbackOrder = ["groq", "anthropic", "openai", "google"].filter(p => p !== provider);

        for (const fbProvider of fallbackOrder) {
          const fbKey = fallbackKeys[fbProvider];
          if (!fbKey) continue;

          try {
            const fbModel = pickModel(complexity, fbProvider);
            const { url: fbUrl, headers: fbHeaders, body: fbBody } = buildProviderRequest(fbProvider, fbModel, fbKey, optimizedMessages);
            const fbResponse = await fetch(fbUrl, { method: "POST", headers: fbHeaders, body: JSON.stringify(fbBody), signal: AbortSignal.timeout(PROVIDER_TIMEOUT) });

            if (fbResponse.status < 400) {
              const fbData = await fbResponse.json();
              const fbLatency = Date.now() - startTime;
              const outputTokens = estimateTokens(JSON.stringify(fbData).slice(0, 2000));
              const cost = calculateCost(fbModel, inputTokens, outputTokens);
              const costWithout = calculateCost(getExpensiveModel(fbProvider), inputTokens, outputTokens);

              await rSet(cacheKey, fbData, CACHE_TTL);
              await logRequest({
                cache_hit: false, tokens_saved: savedChars, provider: fbProvider, model: fbModel,
                complexity, latency: fbLatency, userId, tags: cleanTags, is_error: false,
                input_tokens: inputTokens, output_tokens: outputTokens,
                cost, cost_saved: costWithout - cost, fallback: true, original_provider: provider, webhookUrl,
              });

              return NextResponse.json({
                ...fbData,
                tokensave_meta: {
                  request_id: "req_" + randomUUID(),
                  cache_hit: false, model_used: fbModel, complexity, chars_saved: savedChars,
                  quality_mode: quality, method: "fallback", latency_ms: fbLatency,
                  original_provider: provider, fallback_provider: fbProvider,
                  cost, cost_without_optimization: costWithout,
                  savings_percent: Math.round(((costWithout - cost) / costWithout) * 100),
                  input_tokens: inputTokens, output_tokens: outputTokens, tags: cleanTags,
                },
              }, {
                headers: { "X-RateLimit-Remaining": String(Math.max(0, RATE_LIMIT - rlCount)), "X-RateLimit-Limit": String(RATE_LIMIT) },
              });
            }
          } catch { continue; }
        }
      }

      // No fallback worked, return error
      await logRequest({
        cache_hit: false, provider, model, complexity, latency, userId, tags: cleanTags,
        is_error: true, error_code: aiResponse.status, error_message: aiData.error?.message || "Unknown", webhookUrl,
      });

      return NextResponse.json({
        error: aiData.error,
        tokensave_meta: {
          request_id: "req_" + randomUUID(),
          cache_hit: false, model_used: model, complexity, chars_saved: savedChars,
          quality_mode: quality, latency_ms: latency, is_error: true, tags: cleanTags,
          note: "Error from " + provider + "." + (isRateLimit ? " Add fallbackKeys for auto-switching." : ""),
        },
      }, { status: aiResponse.status });
    }

    // Success — cache and return
    const outputTokens = estimateTokens(JSON.stringify(aiData).slice(0, 2000));
    const cost = calculateCost(model, inputTokens, outputTokens);
    const costWithout = calculateCost(getExpensiveModel(provider), inputTokens, outputTokens);

    await rSet(cacheKey, aiData, CACHE_TTL);
    await logRequest({
      cache_hit: false, tokens_saved: savedChars, provider, model, complexity, latency,
      userId, tags: cleanTags, is_error: false, input_tokens: inputTokens, output_tokens: outputTokens,
      cost, cost_saved: costWithout - cost, webhookUrl,
    });

    return NextResponse.json({
      ...aiData,
      tokensave_meta: {
        request_id: "req_" + randomUUID(),
        cache_hit: false, model_used: model, complexity, chars_saved: savedChars,
        quality_mode: quality, latency_ms: latency,
        method: complexity === "simple" ? "routed_to_cheap" : "routed_to_smart",
        cost, cost_without_optimization: costWithout,
        savings_percent: Math.round(((costWithout - cost) / costWithout) * 100),
        input_tokens: inputTokens, output_tokens: outputTokens, tags: cleanTags,
      },
    }, {
      headers: { "X-RateLimit-Remaining": String(Math.max(0, RATE_LIMIT - rlCount)), "X-RateLimit-Limit": String(RATE_LIMIT) },
    });

  } catch (error) {
        const latency = Date.now() - startTime;
        const detail = error instanceof Error ? error.message : "Unknown error";
        // The detail is kept in the log. The caller only ever sees a generic
        // message because the raw text can carry a connection string.
        await logRequest({ is_error: true, error_message: detail, latency });
        return NextResponse.json({ error: "TokenSave proxy error" }, { status: 500 });
  }
}

// GET handler
export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "TokenSave API Proxy",
    version: "3.1.0",
    docs: "https://tokensave.vercel.app/docs",
    security: "https://tokensave.vercel.app/security",
    changelog: "https://tokensave.vercel.app/changelog",
    health: "https://tokensave.vercel.app/api/health",
    providers: ["anthropic", "openai", "google", "groq"],
    supported_models: Object.keys(PRICING),
    quality_modes: {
      auto: "Smart routing — defaults to quality when unsure (recommended)",
      max_savings: "Aggressive cost optimization",
      max_quality: "Best model only — cache is the only optimization",
    },
    rate_limit: RATE_LIMIT + " requests/minute",
    features: [
      "Semantic caching with 30-minute TTL",
      "Smart model routing by complexity",
      "Safe prompt compression",
      "Multi-provider automatic fallback",
      "Real per-token cost tracking",
      "Latency monitoring (avg + P95)",
      "Custom request tags",
      "Webhook notifications",
      "Per-user analytics",
      "Quality modes (auto/max_savings/max_quality)",
      "Rate limiting with headers",
      "Input validation and sanitization",
      "Security audit logging",
    ],
    endpoints: {
      proxy: { method: "POST", url: "https://tokensave.vercel.app/api/proxy" },
      batch: { method: "POST", url: "https://tokensave.vercel.app/api/batch" },
      smart_context: { method: "POST", url: "https://tokensave.vercel.app/api/smart-context" },
      trim_context: { method: "POST", url: "https://tokensave.vercel.app/api/trim-context" },
      stats: { method: "GET", url: "https://tokensave.vercel.app/api/stats" },
      health: { method: "GET", url: "https://tokensave.vercel.app/api/health" },
      teams: { method: "POST", url: "https://tokensave.vercel.app/api/teams" },
      webhooks: { method: "POST", url: "https://tokensave.vercel.app/api/webhooks" },
      audit: { method: "GET", url: "https://tokensave.vercel.app/api/audit" },
    },
  });
}
