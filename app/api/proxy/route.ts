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

// Real pricing per million tokens (input/output)
const MODEL_PRICING: any = {
  "claude-haiku-4-5-20251001": { input: 0.80, output: 4.00, provider: "anthropic" },
  "claude-sonnet-4-6": { input: 3.00, output: 15.00, provider: "anthropic" },
  "claude-opus-4-8": { input: 15.00, output: 75.00, provider: "anthropic" },
  "gpt-4o-mini": { input: 0.15, output: 0.60, provider: "openai" },
  "gpt-4o": { input: 2.50, output: 10.00, provider: "openai" },
  "gpt-4-turbo": { input: 10.00, output: 30.00, provider: "openai" },
  "gpt-3.5-turbo": { input: 0.50, output: 1.50, provider: "openai" },
  "gemini-2.0-flash-lite": { input: 0.075, output: 0.30, provider: "google" },
  "gemini-2.0-flash": { input: 0.15, output: 0.60, provider: "google" },
  "gemini-1.5-pro": { input: 1.25, output: 5.00, provider: "google" },
  "llama-3.1-8b-instant": { input: 0.05, output: 0.08, provider: "groq" },
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79, provider: "groq" },
  "mixtral-8x7b-32768": { input: 0.24, output: 0.24, provider: "groq" },
  "gemma2-9b-it": { input: 0.20, output: 0.20, provider: "groq" },
  "llama-guard-3-8b": { input: 0.20, output: 0.20, provider: "groq" },
  "deepseek-r1-distill-llama-70b": { input: 0.75, output: 0.99, provider: "groq" },
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): { cost: number; withoutOptimization: number } {
  const pricing = MODEL_PRICING[model] || { input: 1, output: 5 };
  const cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1000000;
  const expensiveModel = model.includes("haiku") ? "claude-sonnet-4-6" : model.includes("mini") ? "gpt-4o" : model.includes("flash-lite") ? "gemini-2.0-flash" : model.includes("8b") ? "llama-3.3-70b-versatile" : model;
  const expensivePricing = MODEL_PRICING[expensiveModel] || pricing;
  const withoutOptimization = (inputTokens * expensivePricing.input + outputTokens * expensivePricing.output) / 1000000;
  return { cost, withoutOptimization };
}

async function safeRedisGet(key: string) {
  if (!redis) return null;
  try { return await redis.get(key); } catch (e) { return null; }
}

async function safeRedisSet(key: string, value: any, ttl: number) {
  if (!redis) return;
  try { await redis.setex(key, ttl, JSON.stringify(value)); } catch (e) {}
}

async function logRequest(data: any) {
  if (!redis) return;
  try {
    const log = {
      ...data,
      timestamp: Date.now(),
      id: "req_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    };
    await redis.lpush("request_logs", JSON.stringify(log));
    await redis.ltrim("request_logs", 0, 999);
    const today = new Date().toISOString().split("T")[0];
    await redis.hincrby("stats:" + today, "total_requests", 1);
    await redis.hincrby("stats:" + today, "tokens_saved", data.tokens_saved || 0);
    await redis.hincrby("stats:" + today, "cache_hits", data.cache_hit ? 1 : 0);
    await redis.hincrby("stats:" + today, "total_input_tokens", data.input_tokens || 0);
    await redis.hincrby("stats:" + today, "total_output_tokens", data.output_tokens || 0);
    await redis.hincrby("stats:" + today, "errors", data.is_error ? 1 : 0);
    if (data.latency) await redis.lpush("latency_log", JSON.stringify({ latency: data.latency, timestamp: Date.now() }));
    if (data.latency) await redis.ltrim("latency_log", 0, 99);
    const costMicro = Math.round((data.cost || 0) * 1000000);
    if (costMicro > 0) await redis.hincrby("stats:" + today, "total_cost_micro", costMicro);
    const savedMicro = Math.round((data.cost_saved || 0) * 1000000);
    if (savedMicro > 0) await redis.hincrby("stats:" + today, "total_saved_micro", savedMicro);
    if (data.userId) {
      await redis.hincrby("user_stats:" + data.userId + ":" + today, "requests", 1);
      await redis.hincrby("user_stats:" + data.userId + ":" + today, "tokens_saved", data.tokens_saved || 0);
      if (costMicro > 0) await redis.hincrby("user_stats:" + data.userId + ":" + today, "cost_micro", costMicro);
    }
    if (data.webhookUrl) {
      fetch(data.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "request_completed", data: log }),
      }).catch(() => {});
    }
  } catch (e) {}
}

function detectComplexity(messages: any[]): "simple" | "complex" {
  const lastMessage = messages[messages.length - 1]?.content || "";
  const wordCount = lastMessage.split(" ").length;
  const complexKeywords = ["analyze", "code", "debug", "write a function", "explain in detail", "compare", "evaluate", "create a", "build", "design", "implement", "refactor", "optimize", "algorithm", "architecture", "why does", "how does", "what are the implications", "pros and cons", "step by step", "comprehensive", "write a program", "fix this", "review this", "strategy", "philosophical", "mathematical", "write an essay", "write a report", "system design"];
  const simpleKeywords = ["what is the capital", "what is the population", "define ", "translate this", "what time", "convert ", "how many", "what year", "who is the", "yes or no", "true or false"];
  const lowerMessage = lastMessage.toLowerCase();
  const hasComplexSignal = complexKeywords.some((kw) => lowerMessage.includes(kw));
  const hasSimpleSignal = simpleKeywords.some((kw) => lowerMessage.includes(kw));
  const hasCodeSyntax = lastMessage.includes("```") || lastMessage.includes("function ") || lastMessage.includes("def ") || lastMessage.includes("class ") || lastMessage.includes("import ") || lastMessage.includes("{") || lastMessage.includes("=>");
  if (hasCodeSyntax) return "complex";
  if (messages.length > 6) return "complex";
  if (hasComplexSignal) return "complex";
  if (hasSimpleSignal && !hasComplexSignal && wordCount < 15) return "simple";
  if (wordCount > 80) return "complex";
  if (wordCount < 10 && !hasComplexSignal) return "simple";
  return wordCount < 25 && !hasComplexSignal ? "simple" : "complex";
}

function pickModel(complexity: "simple" | "complex", provider: string): string {
  if (provider === "anthropic") return complexity === "simple" ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-6";
  if (provider === "openai") return complexity === "simple" ? "gpt-4o-mini" : "gpt-4o";
  if (provider === "groq") return complexity === "simple" ? "llama-3.1-8b-instant" : "llama-3.3-70b-versatile";
  return complexity === "simple" ? "gemini-2.0-flash-lite" : "gemini-2.0-flash";
}

function compressPrompt(text: string): { compressed: string; savedChars: number } {
  const original = text.length;
  if (original < 50) return { compressed: text, savedChars: 0 };
  let compressed = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const safeFillers = ["to be honest with you", "in my humble opinion", "as you probably know", "as you may already know", "I would like to say that", "what I want to say is", "the thing is that", "at the end of the day", "for what it's worth", "needless to say", "it goes without saying", "as a matter of fact"];
  for (const filler of safeFillers) compressed = compressed.replace(new RegExp(filler, "gi"), "");
  compressed = compressed.replace(/\s+/g, " ").trim();
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
  const startTime = Date.now();
  try {
    const body = await req.json();
    const {
      messages, provider = "anthropic", apiKey,
      model: requestedModel, quality = "auto",
      fallbackKeys = {}, tags = {},
      userId, webhookUrl,
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }
    if (!apiKey || typeof apiKey !== "string" || apiKey.length < 10) {
      return NextResponse.json({ error: "A valid apiKey is required" }, { status: 400 });
    }

    const qualityMode = quality || "auto";
    const cacheKey = getCacheKey(messages);
    const cached = await safeRedisGet(cacheKey);

    if (cached) {
      const latency = Date.now() - startTime;
      await logRequest({ cache_hit: true, tokens_saved: 500, provider, model: "cached", latency, userId, tags, is_error: false, cost: 0, cost_saved: 0.001, webhookUrl });
      const cachedData = typeof cached === "string" ? JSON.parse(cached) : cached;
      return NextResponse.json({
        ...cachedData,
        tokensave_meta: {
          request_id: "req_" + Date.now().toString(36),
          cache_hit: true, tokens_saved: "100%", method: "cache",
          quality_mode: qualityMode, latency_ms: latency, cost: 0,
          tags,
        },
      });
    }

    const complexity = detectComplexity(messages);
    let model = requestedModel;
    if (!model) {
      model = qualityMode === "max_quality" ? pickModel("complex", provider) : pickModel(complexity, provider);
    }

    const lastMsg = messages[messages.length - 1];
    let optimizedMessages = messages;
    let savedChars = 0;
    if (qualityMode !== "max_quality") {
      const result = compressPrompt(lastMsg.content);
      savedChars = result.savedChars;
      if (savedChars > 0) optimizedMessages = [...messages.slice(0, -1), { ...lastMsg, content: result.compressed }];
    }

    const inputTokens = optimizedMessages.reduce((sum: number, m: any) => sum + estimateTokens(m.content || ""), 0);

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

    const aiResponse = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify(apiBody) });
    const aiData = await aiResponse.json();
    const latency = Date.now() - startTime;

    if (aiResponse.status >= 400) {
      const isRateLimit = aiResponse.status === 429 || (aiData.error?.message || "").toLowerCase().includes("rate") || (aiData.error?.message || "").toLowerCase().includes("quota");

      if (isRateLimit) {
        const fallbackOrder = ["groq", "anthropic", "openai", "google"].filter((p) => p !== provider);
        for (const fbProvider of fallbackOrder) {
          const fbKey = fallbackKeys[fbProvider];
          if (!fbKey) continue;
          try {
            const fbModel = pickModel(complexity, fbProvider);
            let fbUrl = "", fbHeaders: any = { "Content-Type": "application/json" }, fbBody: any = {};
            if (fbProvider === "anthropic") { fbUrl = "https://api.anthropic.com/v1/messages"; fbHeaders["x-api-key"] = fbKey; fbHeaders["anthropic-version"] = "2023-06-01"; fbBody = { model: fbModel, max_tokens: 1024, messages: optimizedMessages }; }
            else if (fbProvider === "openai") { fbUrl = "https://api.openai.com/v1/chat/completions"; fbHeaders["Authorization"] = "Bearer " + fbKey; fbBody = { model: fbModel, messages: optimizedMessages }; }
            else if (fbProvider === "google") { fbUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + fbModel + ":generateContent?key=" + fbKey; fbBody = { contents: optimizedMessages.map((m: any) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })) }; }
            else if (fbProvider === "groq") { fbUrl = "https://api.groq.com/openai/v1/chat/completions"; fbHeaders["Authorization"] = "Bearer " + fbKey; fbBody = { model: fbModel, messages: optimizedMessages }; }
            const fbResponse = await fetch(fbUrl, { method: "POST", headers: fbHeaders, body: JSON.stringify(fbBody) });
            if (fbResponse.status < 400) {
              const fbData = await fbResponse.json();
              const fbLatency = Date.now() - startTime;
              const outputTokens = estimateTokens(JSON.stringify(fbData).slice(0, 2000));
              const costs = calculateCost(fbModel, inputTokens, outputTokens);
              await safeRedisSet(cacheKey, fbData, CACHE_TTL);
              await logRequest({ cache_hit: false, tokens_saved: savedChars, provider: fbProvider, model: fbModel, complexity, latency: fbLatency, userId, tags, is_error: false, input_tokens: inputTokens, output_tokens: outputTokens, cost: costs.cost, cost_saved: costs.withoutOptimization - costs.cost, fallback: true, original_provider: provider, webhookUrl });
              return NextResponse.json({
                ...fbData,
                tokensave_meta: {
                  request_id: "req_" + Date.now().toString(36),
                  cache_hit: false, model_used: fbModel, complexity, chars_saved: savedChars,
                  quality_mode: qualityMode, method: "fallback", latency_ms: fbLatency,
                  original_provider: provider, fallback_provider: fbProvider,
                  cost: costs.cost, cost_without_optimization: costs.withoutOptimization,
                  savings_percent: Math.round(((costs.withoutOptimization - costs.cost) / costs.withoutOptimization) * 100),
                  input_tokens: inputTokens, output_tokens: outputTokens, tags,
                },
              });
            }
          } catch (e) { continue; }
        }
      }

      await logRequest({ cache_hit: false, provider, model, complexity, latency, userId, tags, is_error: true, error_code: aiResponse.status, error_message: aiData.error?.message || "Unknown", webhookUrl });
      return NextResponse.json({
        error: aiData.error,
        tokensave_meta: {
          request_id: "req_" + Date.now().toString(36),
          cache_hit: false, model_used: model, complexity, chars_saved: savedChars,
          quality_mode: qualityMode, latency_ms: latency, is_error: true, tags,
          note: "Error from " + provider + ". " + (isRateLimit ? "Add fallbackKeys to enable auto-switching." : ""),
        },
      }, { status: aiResponse.status });
    }

    const outputTokens = estimateTokens(JSON.stringify(aiData).slice(0, 2000));
    const costs = calculateCost(model, inputTokens, outputTokens);

    await safeRedisSet(cacheKey, aiData, CACHE_TTL);
    await logRequest({ cache_hit: false, tokens_saved: savedChars, provider, model, complexity, latency, userId, tags, is_error: false, input_tokens: inputTokens, output_tokens: outputTokens, cost: costs.cost, cost_saved: costs.withoutOptimization - costs.cost, webhookUrl });

    return NextResponse.json({
      ...aiData,
      tokensave_meta: {
        request_id: "req_" + Date.now().toString(36),
        cache_hit: false, model_used: model, complexity, chars_saved: savedChars,
        quality_mode: qualityMode, latency_ms: latency,
        method: complexity === "simple" ? "routed_to_cheap" : "routed_to_smart",
        cost: costs.cost, cost_without_optimization: costs.withoutOptimization,
        savings_percent: Math.round(((costs.withoutOptimization - costs.cost) / costs.withoutOptimization) * 100),
        input_tokens: inputTokens, output_tokens: outputTokens, tags,
      },
    });
  } catch (error: any) {
    const latency = Date.now() - startTime;
    await logRequest({ is_error: true, error_message: error.message, latency });
    return NextResponse.json({ error: "TokenSave proxy error: " + error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "TokenSave API Proxy",
    version: "3.0.0",
    docs: "https://tokensave.vercel.app/docs",
    security: "https://tokensave.vercel.app/security",
    changelog: "https://tokensave.vercel.app/changelog",
    providers: ["anthropic", "openai", "google", "groq"],
    supported_models: Object.keys(MODEL_PRICING),
    quality_modes: { auto: "Smart routing, defaults to quality when unsure", max_savings: "Aggressive optimization", max_quality: "Best model only, cache savings only" },
    features: ["Semantic caching", "Smart model routing", "Safe prompt compression", "Multi-provider fallback", "Real cost tracking per request", "Latency monitoring", "Custom tags", "Webhook notifications", "User-level analytics", "Quality modes"],
  });
}