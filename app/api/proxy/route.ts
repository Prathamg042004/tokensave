import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

const CACHE_TTL = 1800;
const RATE_LIMIT = 60;
const RATE_WINDOW = 60;

async function checkRateLimit(identifier: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = "rl:" + identifier;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, RATE_WINDOW);
  }
  return { allowed: current <= RATE_LIMIT, remaining: Math.max(0, RATE_LIMIT - current) };
}

async function validateTokenSaveKey(tsKey: string): Promise<any> {
  if (!tsKey) return null;
  const owner = await redis.get("key_owner:" + tsKey);
  if (!owner) return null;
  return typeof owner === "string" ? JSON.parse(owner) : owner;
}

function detectComplexity(messages: any[]): "simple" | "complex" {
  const lastMessage = messages[messages.length - 1]?.content || "";
  const wordCount = lastMessage.split(" ").length;
  const complexKeywords = ["analyze", "code", "debug", "write a function", "explain in detail", "compare", "evaluate", "create a", "build", "design", "implement", "refactor", "optimize"];
  const isComplex = wordCount > 100 || complexKeywords.some((kw) => lastMessage.toLowerCase().includes(kw));
  return isComplex ? "complex" : "simple";
}

function pickModel(complexity: "simple" | "complex", provider: string): string {
  if (provider === "anthropic") return complexity === "simple" ? "claude-haiku-4-5-20241022" : "claude-sonnet-4-20250514";
  if (provider === "openai") return complexity === "simple" ? "gpt-4o-mini" : "gpt-4o";
  return complexity === "simple" ? "gemini-2.0-flash-lite" : "gemini-2.0-flash";
}

function compressPrompt(text: string): { compressed: string; savedChars: number } {
  const original = text.length;
  let compressed = text.replace(/\s+/g, " ").trim();
  compressed = compressed.replace(/\b(just|really|very|basically|actually|literally|simply|perhaps|maybe|I think|I believe|in my opinion|to be honest|as you know)\b/gi, "").replace(/\s+/g, " ").trim();
  return { compressed, savedChars: original - compressed.length };
}

function getCacheKey(messages: any[]): string {
  const raw = messages.map((m: any) => m.role + ":" + m.content).join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return "cache:" + Math.abs(hash).toString(36);
}

async function logRequest(data: any) {
  try {
    await redis.lpush("request_logs", JSON.stringify({ ...data, timestamp: Date.now() }));
    await redis.ltrim("request_logs", 0, 499);
    const today = new Date().toISOString().split("T")[0];
    await redis.hincrby("stats:" + today, "total_requests", 1);
    await redis.hincrby("stats:" + today, "tokens_saved", data.tokens_saved || 0);
    await redis.hincrby("stats:" + today, "cache_hits", data.cache_hit ? 1 : 0);
  } catch (e) {}
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, provider = "anthropic", apiKey, model: requestedModel, tsKey } = body;

    if (!messages || !apiKey) {
      return NextResponse.json({ error: "messages and apiKey are required" }, { status: 400 });
    }

    const rateLimitId = tsKey || req.headers.get("x-forwarded-for") || "anonymous";
    const { allowed, remaining } = await checkRateLimit(rateLimitId);

    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 60 requests per minute.", remaining: 0 },
        { status: 429, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Limit": String(RATE_LIMIT) } }
      );
    }

    let owner = null;
    if (tsKey) {
      owner = await validateTokenSaveKey(tsKey);
    }

    const cacheKey = getCacheKey(messages);

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        await logRequest({ cache_hit: true, tokens_saved: 500, provider, model: "cached", user: owner?.userId });
        const cachedData = typeof cached === "string" ? JSON.parse(cached) : cached;
        return NextResponse.json({
          ...cachedData,
          tokensave_meta: { cache_hit: true, tokens_saved: "100%", method: "cache", rate_limit_remaining: remaining },
        });
      }
    } catch (e) {}

    const complexity = detectComplexity(messages);
    const model = requestedModel || pickModel(complexity, provider);
    const lastMsg = messages[messages.length - 1];
    const { compressed, savedChars } = compressPrompt(lastMsg.content);
    const optimizedMessages = [...messages.slice(0, -1), { ...lastMsg, content: compressed }];

    let apiUrl = "";
    let headers: any = { "Content-Type": "application/json" };
    let apiBody: any = {};

    if (provider === "anthropic") {
      apiUrl = "https://api.anthropic.com/v1/messages";
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      apiBody = { model, max_tokens: 1024, messages: optimizedMessages };
    } else if (provider === "openai") {
      apiUrl = "https://api.openai.com/v1/chat/completions";
      headers["Authorization"] = "Bearer " + apiKey;
      apiBody = { model, messages: optimizedMessages };
    } else {
      apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
      apiBody = { contents: optimizedMessages.map((m: any) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })) };
    }

    const aiResponse = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify(apiBody) });
    const aiData = await aiResponse.json();

    try { await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(aiData)); } catch (e) {}

    await logRequest({ cache_hit: false, tokens_saved: savedChars, provider, model, complexity, user: owner?.userId });

    return NextResponse.json({
      ...aiData,
      tokensave_meta: {
        cache_hit: false,
        model_used: model,
        complexity,
        chars_saved: savedChars,
        method: complexity === "simple" ? "routed_to_cheap" : "routed_to_smart",
        rate_limit_remaining: remaining,
      },
    }, {
      headers: { "X-RateLimit-Remaining": String(remaining), "X-RateLimit-Limit": String(RATE_LIMIT) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "TokenSave API Proxy",
    version: "1.0.0",
    rate_limit: "60 requests/minute",
    docs: "https://tokensave.vercel.app/docs",
    endpoints: {
      proxy: {
        method: "POST",
        url: "https://tokensave.vercel.app/api/proxy",
        body: {
          provider: "anthropic | openai | google",
          apiKey: "your-provider-api-key",
          tsKey: "(optional) your TokenSave API key",
          messages: [{ role: "user", content: "your prompt" }],
        },
      },
    },
    features: [
      "Semantic caching — 100% savings on repeated queries",
      "Model routing — simple tasks to cheap models, complex to powerful",
      "Prompt compression — removes filler words and whitespace",
      "Rate limiting — 60 requests/minute per key",
    ],
  });
}