import { accounting, cacheAccounting } from "../../../sdk/accounting.js";
import { providerRequest, validResponse } from "../../../sdk/tokensave.js";
import { keyOwner, privateCacheKey, accessResponse, readJson, consumeRateLimit, rateLimitScope } from "../../lib/security.mjs";
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// Redis connection
let redis: any = null;
try {
  const url = process.env.UPSTASH_REDIS_REST_URL || "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || "";
  if (url && token) redis = new Redis({ url, token });
} catch (e) {}

// Constants
const CACHE_TTL = 1800;
const RATE_LIMIT = 60;
const RATE_WINDOW = 60;
const MAX_BODY_SIZE = 500000;
const MAX_MESSAGE_LENGTH = 100000;
const MAX_MESSAGES = 100;

// Safe Redis operations
async function rGet(key: string): Promise<any> {
  if (!redis) return null;
  try { return await redis.get(key); } catch { return null; }
}

async function rSet(key: string, value: any, ttl: number): Promise<void> {
  if (!redis) return;
  try { await redis.setex(key, ttl, JSON.stringify(value)); } catch {}
}

async function logRequest(data: any): Promise<void> {
  if (!redis) return;
  try {
    const entry = { ...data, accounting_version: 1, timestamp: Date.now(), id: "req_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) };
    await redis.lpush("billing:v1:request_logs", JSON.stringify(entry));
    await redis.ltrim("billing:v1:request_logs", 0, 999);

    const today = new Date().toISOString().split("T")[0];
    const key = "billing:v1:stats:" + today;
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

    if (data.cost == null) await redis.hincrby(key, "unknown_cost_requests", 1);
    const costNano = Math.round((data.cost || 0) * 1000000000);
    if (costNano > 0) await redis.hincrby(key, "total_cost_nano", costNano);
    const savedNano = Math.round((data.cost_saved || 0) * 1000000000);
    if (savedNano > 0) await redis.hincrby(key, "total_saved_nano", savedNano);

    if (data.userId) {
      const userKey = "billing:v1:user_stats:" + data.userId + ":" + today;
      const values = { total_requests:1, tokens_saved:data.tokens_saved || 0, cache_hits:data.cache_hit ? 1 : 0,
        total_input_tokens:data.input_tokens || 0,total_output_tokens:data.output_tokens || 0,
        errors:data.is_error ? 1 : 0,total_cost_nano:costNano,total_saved_nano:savedNano,
        unknown_cost_requests: data.cost == null ? 1 : 0 };
      for (const [field,value] of Object.entries(values)) await redis.hincrby(userKey,field,value);
      await redis.lpush("billing:v1:request_logs:" + data.userId, JSON.stringify(entry));
      await redis.ltrim("billing:v1:request_logs:" + data.userId,0,99);
      await redis.lpush("audit_log:" + data.userId,JSON.stringify({event:data.is_error ? "api_error" : "api_request",timestamp:Date.now(),provider:data.provider,model:data.model}));
      await redis.ltrim("audit_log:" + data.userId,0,99);
      if (data.latency) {
        await redis.lpush("latency_log:" + data.userId,JSON.stringify({latency:data.latency,timestamp:Date.now()}));
        await redis.ltrim("latency_log:" + data.userId,0,99);
      }
    }

  } catch {}
}

// Helpers
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

// Preserve arbitrary prose, code, whitespace and quoted instructions verbatim.
function compressPrompt(text: string): { compressed: string; savedChars: number } {
  return { compressed: text, savedChars: 0 };
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
    if (!msg || !msg.role || !msg.content) return "messages[" + i + "] must have role and content";
    if (!["user", "assistant", "system"].includes(msg.role)) return "messages[" + i + "].role must be user, assistant, or system";
    if (typeof msg.content !== "string") return "messages[" + i + "].content must be a string";
    if (msg.content.length > MAX_MESSAGE_LENGTH) return "messages[" + i + "].content exceeds 100K character limit";
  }
  if (!body.messages.some((m: {role: string}) => m.role !== "system")) return "At least one non-system message is required";
  if (!body.apiKey || typeof body.apiKey !== "string" || body.apiKey.length < 10) {
    return "A valid apiKey is required";
  }
  if (body.apiKey.length > 500) return "apiKey is too long";
  const validProviders = ["anthropic", "openai", "google", "groq"];
  if (body.provider && !validProviders.includes(body.provider)) {
    return "Invalid provider. Use: " + validProviders.join(", ");
  }
  if (body.quality && !["auto", "max_savings", "max_quality"].includes(body.quality)) return "Invalid quality mode";
  if (body.model !== undefined && (typeof body.model !== "string" || !/^[a-zA-Z0-9._:/-]{1,200}$/.test(body.model))) return "Invalid model";
  if (body.fallbackKeys !== undefined && (!body.fallbackKeys || typeof body.fallbackKeys !== "object" || Array.isArray(body.fallbackKeys) || Object.entries(body.fallbackKeys).some(([p,k]) => !validProviders.includes(p) || typeof k !== "string" || k.length < 10 || k.length > 500))) return "Invalid fallbackKeys";
  return null;
}

// Build provider request
function buildProviderRequest(provider: string, model: string, apiKey: string, messages: {role: string; content: string}[]) {
  return providerRequest(provider, model, apiKey, messages, 1024);
}

// POST handler
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Request size check
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      return NextResponse.json({ error: "Request too large. Maximum 500KB." }, { status: 413 });
    }

    const body = await readJson(req);

    // Validate input
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
      webhookUrl,
    } = body;

    const userId = body.tsKey ? await keyOwner(redis, body.tsKey) : undefined;
    if (webhookUrl) return NextResponse.json({error:"Outbound webhook callbacks are disabled."},{status:400});

    // Durable account/credential limits cannot be bypassed with forwarded headers.
    const budget = await consumeRateLimit(redis, rateLimitScope(userId, provider, apiKey), RATE_LIMIT, RATE_WINDOW);
    const rlCount = budget.count;
    if (!budget.allowed) {
      await logRequest({ is_error: true, provider, latency: Date.now() - startTime, userId, error_message: "Rate limit exceeded" });
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum " + RATE_LIMIT + " requests per minute." },
        { status: 429, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Limit": String(RATE_LIMIT), "Retry-After": String(budget.retryAfter) } }
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

    // Retain validated text verbatim, including whitespace and code indentation
    const cleanMessages = messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    // Detect complexity and pick model
    const complexity = detectComplexity(cleanMessages);
    const model = requestedModel || (quality === "max_quality" ? pickModel("complex", provider) : pickModel(complexity, provider));

    // Check cache
    const cacheKey = "accounting:v1:" + privateCacheKey(cleanMessages, provider, model, quality, apiKey);
    const cached = await rGet(cacheKey);

    let cacheRecord;
    try { cacheRecord = typeof cached === "string" ? JSON.parse(cached) : cached; } catch { cacheRecord = null; }
    if (cacheRecord?.version === 1 && cacheRecord.accounting &&
        typeof cacheRecord.accounting === "object" && !Array.isArray(cacheRecord.accounting) &&
        (cacheRecord.accounting.cost === null || (typeof cacheRecord.accounting.cost === "number" && Number.isFinite(cacheRecord.accounting.cost) && cacheRecord.accounting.cost >= 0)) &&
        validResponse(provider, cacheRecord.data)) {
      const latency = Date.now() - startTime;
      const meta = cacheAccounting(cacheRecord.accounting);
      await logRequest({ ...meta, cache_hit: true, provider, model: meta.model_used, latency, userId, tags: cleanTags, is_error: false });
      return NextResponse.json({ ...cacheRecord.data, tokensave_meta: {
        ...meta, request_id: crypto.randomUUID(), cache_hit: true, method: "cache", quality_mode: quality, latency_ms: latency, tags: cleanTags,
      } }, { headers: { "X-RateLimit-Remaining": String(Math.max(0, RATE_LIMIT - rlCount)), "X-RateLimit-Limit": String(RATE_LIMIT) } });
    }

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

    const deadline = AbortSignal.timeout(30000);

    // Build and send request
    const { url: apiUrl, headers, body: apiBody } = buildProviderRequest(provider, model, apiKey, optimizedMessages);
    const aiResponse = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify(apiBody), redirect:"error", signal:deadline });
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
            const fbModel = pickModel(quality === "max_quality" ? "complex" : complexity, fbProvider);
            const { url: fbUrl, headers: fbHeaders, body: fbBody } = buildProviderRequest(fbProvider, fbModel, fbKey, optimizedMessages);
            const fbResponse = await fetch(fbUrl, { method: "POST", headers: fbHeaders, body: JSON.stringify(fbBody), redirect:"error", signal:deadline });

            if (fbResponse.ok) {
              const fbData = await fbResponse.json();
              const fbLatency = Date.now() - startTime;
              if (!validResponse(fbProvider, fbData)) continue;
              const meta = accounting(fbProvider, fbModel, fbData);

              // Fallback responses are not cached under the primary provider identity.
              await logRequest({
                ...meta, cache_hit: false, provider: fbProvider, model: meta.model_used,
                complexity, latency: fbLatency, userId, tags: cleanTags, is_error: false,
                fallback: true, original_provider: provider, webhookUrl,
              });

              return NextResponse.json({
                ...fbData,
                tokensave_meta: {
                  ...meta, request_id: crypto.randomUUID(),
                  cache_hit: false, complexity, chars_saved: savedChars,
                  quality_mode: quality, method: "fallback", latency_ms: fbLatency,
                  original_provider: provider, fallback_provider: fbProvider,
                  tags: cleanTags,
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
          request_id: "req_" + Date.now().toString(36),
          cache_hit: false, model_used: model, complexity, chars_saved: savedChars,
          quality_mode: quality, latency_ms: latency, is_error: true, tags: cleanTags,
          note: "Error from " + provider + "." + (isRateLimit ? " Add fallbackKeys for auto-switching." : ""),
        },
      }, { status: aiResponse.status });
    }

    // Provider usage is authoritative; dollar values use versioned public rates.
    if (!validResponse(provider, aiData)) return NextResponse.json({error:"Invalid provider response"},{status:502});
    const meta = accounting(provider, model, aiData);
    await rSet(cacheKey, { version: 1, data: aiData, accounting: meta }, CACHE_TTL);
    await logRequest({ ...meta, cache_hit: false, provider, model: meta.model_used, complexity, latency,
      userId, tags: cleanTags, is_error: false });

    return NextResponse.json({
      ...aiData,
      tokensave_meta: {
        ...meta, request_id: crypto.randomUUID(),
        cache_hit: false, complexity, chars_saved: savedChars,
        quality_mode: quality, latency_ms: latency,
        method: complexity === "simple" ? "routed_to_cheap" : "routed_to_smart",
        tags: cleanTags,
      },
    }, {
      headers: { "X-RateLimit-Remaining": String(Math.max(0, RATE_LIMIT - rlCount)), "X-RateLimit-Limit": String(RATE_LIMIT) },
    });

  } catch (error: any) {
    const latency = Date.now() - startTime;
    await logRequest({ is_error: true, error_message: error.message, latency });
    return accessResponse(error);
  }
}

// GET handler
export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "TokenSave API Proxy",
    version: "3.1.0",
    docs: "https://tokensave.in/docs",
    security: "https://tokensave.in/security",
    changelog: "https://tokensave.in/changelog",
    health: "https://tokensave.in/api/health",
    providers: ["anthropic", "openai", "google", "groq"],
    supported_models: ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "gpt-4o-mini", "gpt-4o", "gemini-2.0-flash-lite", "gemini-2.0-flash", "llama-3.1-8b-instant", "llama-3.3-70b-versatile"],
    quality_modes: {
      auto: "Smart routing — defaults to quality when unsure (recommended)",
      max_savings: "Aggressive cost optimization",
      max_quality: "Best model only — cache is the only optimization",
    },
    rate_limit: RATE_LIMIT + " requests/minute",
    features: [
      "Credential-isolated exact-match caching with 30-minute TTL",
      "Smart model routing by complexity",
      "Verbatim prompt preservation",
      "Multi-provider automatic fallback",
      "Provider token usage; published-rate cost estimates when verified",
      "Latency monitoring (avg + P95)",
      "Custom request tags",
      "Account-scoped audit logs",
      "Per-user analytics",
      "Quality modes (auto/max_savings/max_quality)",
      "Rate limiting with headers",
      "Input validation and sanitization",
      "Security audit logging",
    ],
    endpoints: {
      proxy: { method: "POST", url: "https://tokensave.in/api/proxy" },
      batch: { method: "POST", url: "https://tokensave.in/api/batch" },
      smart_context: { method: "POST", url: "https://tokensave.in/api/smart-context" },
      trim_context: { method: "POST", url: "https://tokensave.in/api/trim-context" },
      stats: { method: "GET", url: "https://tokensave.in/api/stats" },
      health: { method: "GET", url: "https://tokensave.in/api/health" },
      teams: { method: "POST", url: "https://tokensave.in/api/teams" },
      webhooks: { method: "POST", url: "https://tokensave.in/api/webhooks" },
      audit: { method: "GET", url: "https://tokensave.in/api/audit" },
    },
  });
}
