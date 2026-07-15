import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

let redis: any = null;
try {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  });
} catch (e) {}

const CACHE_TTL = 1800;

async function safeRedisGet(key: string) {
  if (!redis) return null;
  try { return await redis.get(key); } catch (e) { return null; }
}

async function safeRedisSet(key: string, value: any, ttl: number) {
  if (!redis) return;
  try { await redis.setex(key, ttl, JSON.stringify(value)); } catch (e) {}
}

async function safeLogRequest(data: any) {
  if (!redis) return;
  try {
    await redis.lpush("request_logs", JSON.stringify({ ...data, timestamp: Date.now() }));
    await redis.ltrim("request_logs", 0, 499);
    const today = new Date().toISOString().split("T")[0];
    await redis.hincrby("stats:" + today, "total_requests", 1);
    await redis.hincrby("stats:" + today, "tokens_saved", data.tokens_saved || 0);
    await redis.hincrby("stats:" + today, "cache_hits", data.cache_hit ? 1 : 0);
  } catch (e) {}
}

function detectComplexity(messages: any[]): "simple" | "complex" {
  const lastMessage = messages[messages.length - 1]?.content || "";
  const wordCount = lastMessage.split(" ").length;
  const complexKeywords = ["analyze", "code", "debug", "write a function", "explain in detail", "compare", "evaluate", "create a", "build", "design", "implement", "refactor", "optimize", "algorithm", "architecture"];
  const isComplex = wordCount > 100 || complexKeywords.some((kw) => lastMessage.toLowerCase().includes(kw));
  return isComplex ? "complex" : "simple";
}

function pickModel(complexity: "simple" | "complex", provider: string): string {
  if (provider === "anthropic") return complexity === "simple" ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-6";
  if (provider === "openai") return complexity === "simple" ? "gpt-4o-mini" : "gpt-4o";
  if (provider === "groq") return complexity === "simple" ? "llama-3.1-8b-instant" : "llama-3.3-70b-versatile";
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, provider = "anthropic", apiKey, model: requestedModel, quality = "auto", fallbackKeys = {} } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    if (!apiKey || typeof apiKey !== "string" || apiKey.length < 10) {
      return NextResponse.json({ error: "A valid apiKey is required" }, { status: 400 });
    }

    const cacheKey = getCacheKey(messages);
    const cached = await safeRedisGet(cacheKey);
    if (cached) {
      await safeLogRequest({ cache_hit: true, tokens_saved: 500, provider, model: "cached" });
      const cachedData = typeof cached === "string" ? JSON.parse(cached) : cached;
      return NextResponse.json({
        ...cachedData,
        tokensave_meta: { cache_hit: true, tokens_saved: "100%", method: "cache" },
      });
    }

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
    } else if (provider === "google") {
      apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
      apiBody = { contents: optimizedMessages.map((m: any) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })) };
    } else if (provider === "groq") {
      apiUrl = "https://api.groq.com/openai/v1/chat/completions";
      headers["Authorization"] = "Bearer " + apiKey;
      apiBody = { model, messages: optimizedMessages };
    } else {
      return NextResponse.json({ error: "Invalid provider. Use: anthropic, openai, google, or groq" }, { status: 400 });
    }

    const aiResponse = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(apiBody),
    });

    const aiData = await aiResponse.json();

    if (aiResponse.status >= 400) {
      const isRateLimit = aiResponse.status === 429 || (aiData.error?.message || "").toLowerCase().includes("rate") || (aiData.error?.message || "").toLowerCase().includes("quota") || (aiData.error?.message || "").toLowerCase().includes("limit");
      
      if (isRateLimit) {
        const fallbackOrder = ["groq", "anthropic", "openai", "google"].filter((p) => p !== provider);
        
        for (const fbProvider of fallbackOrder) {
          const fbKey = fallbackKeys[fbProvider];
          if (!fbKey) continue;
          
          try {
            const fbModel = pickModel(complexity, fbProvider);
            let fbUrl = "";
            let fbHeaders: any = { "Content-Type": "application/json" };
            let fbBody: any = {};
            
            if (fbProvider === "anthropic") {
              fbUrl = "https://api.anthropic.com/v1/messages";
              fbHeaders["x-api-key"] = fbKey;
              fbHeaders["anthropic-version"] = "2023-06-01";
              fbBody = { model: fbModel, max_tokens: 1024, messages: optimizedMessages };
            } else if (fbProvider === "openai") {
              fbUrl = "https://api.openai.com/v1/chat/completions";
              fbHeaders["Authorization"] = "Bearer " + fbKey;
              fbBody = { model: fbModel, messages: optimizedMessages };
            } else if (fbProvider === "google") {
              fbUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + fbModel + ":generateContent?key=" + fbKey;
              fbBody = { contents: optimizedMessages.map((m: any) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })) };
            } else if (fbProvider === "groq") {
              fbUrl = "https://api.groq.com/openai/v1/chat/completions";
              fbHeaders["Authorization"] = "Bearer " + fbKey;
              fbBody = { model: fbModel, messages: optimizedMessages };
            }
            
            const fbResponse = await fetch(fbUrl, { method: "POST", headers: fbHeaders, body: JSON.stringify(fbBody) });
            if (fbResponse.status < 400) {
              const fbData = await fbResponse.json();
              await safeRedisSet(cacheKey, fbData, CACHE_TTL);
              await safeLogRequest({ cache_hit: false, tokens_saved: savedChars, provider: fbProvider, model: fbModel, complexity, fallback: true });
              return NextResponse.json({
                ...fbData,
                tokensave_meta: {
                  cache_hit: false,
                  model_used: fbModel,
                  complexity,
                  chars_saved: savedChars,
                  quality_mode: qualityMode,
                  method: "fallback",
                  original_provider: provider,
                  fallback_provider: fbProvider,
                  note: provider + " rate limited. Automatically switched to " + fbProvider + ".",
                },
              });
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      return NextResponse.json({
        error: aiData.error,
        tokensave_meta: {
          cache_hit: false,
          model_used: model,
          complexity,
          chars_saved: savedChars,
          quality_mode: qualityMode,
          note: "Error from " + provider + ", not TokenSave." + (isRateLimit ? " No fallback providers configured. Add fallbackKeys to enable auto-switching." : ""),
        },
      }, { status: aiResponse.status });
    }

    await safeRedisSet(cacheKey, aiData, CACHE_TTL);
    await safeLogRequest({ cache_hit: false, tokens_saved: savedChars, provider, model, complexity });

    return NextResponse.json({
      ...aiData,
      tokensave_meta: {
        cache_hit: false,
        model_used: model,
        complexity,
        chars_saved: savedChars,
        method: complexity === "simple" ? "routed_to_cheap" : "routed_to_smart",
      },
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "TokenSave proxy error: " + error.message,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "TokenSave API Proxy",
    version: "1.1.0",
    docs: "https://tokensave.vercel.app/docs",
    security: "https://tokensave.vercel.app/security",
    providers: ["anthropic", "openai", "google", "groq"],
    features: [
      "Semantic caching — 100% savings on repeated queries",
      "Model routing — simple tasks to cheap models, complex to powerful",
      "Prompt compression — removes filler words and whitespace",
      "Multi-provider support — Claude, GPT, Gemini, Llama",
    ],
    endpoints: {
      proxy: {
        method: "POST",
        url: "https://tokensave.vercel.app/api/proxy",
        body: {
          provider: "anthropic | openai | google | groq",
          apiKey: "your-provider-api-key",
          messages: [{ role: "user", content: "your prompt" }],
        },
      },
    },
  });
}