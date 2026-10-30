import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { accounting, cacheAccounting } from "../../../sdk/accounting.js";
import {
  providerRequest,
  validResponse,
  MODELS,
} from "../../../sdk/tokensave.js";
import {
  keyOwner,
  privateCacheKey,
  accessResponse,
  readJson,
  consumeRateLimit,
  rateLimitScope,
  AccessError,
} from "../../lib/security.mjs";
import { proxyInput, record } from "../../lib/validation.mjs";
import type { Message, Provider } from "../../types";
import type { Accounting } from "../../../sdk/tokensave.js";

let redis: Redis | null = null;
try {
  const url = process.env.UPSTASH_REDIS_REST_URL,
    token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) redis = new Redis({ url, token });
} catch {}
const CACHE_TTL = 1800,
  RATE_LIMIT = 60;
type Log = Partial<Omit<Accounting, "currency">> & {
  provider?: string;
  model?: string;
  cache_hit?: boolean;
  is_error?: boolean;
  userId?: string;
  latency: number;
  tags?: Record<string, string>;
  error_code?: number;
  fallback?: boolean;
  original_provider?: string;
};

async function logRequest(data: Log) {
  if (!redis) return;
  try {
    const entry = {
      ...data,
      accounting_version: 1,
      timestamp: Date.now(),
      id: crypto.randomUUID(),
    };
    const today = new Date().toISOString().slice(0, 10);
    const values = {
      total_requests: 1,
      tokens_saved: data.tokens_saved ?? 0,
      cache_hits: data.cache_hit ? 1 : 0,
      total_input_tokens: data.input_tokens ?? 0,
      total_output_tokens: data.output_tokens ?? 0,
      errors: data.is_error ? 1 : 0,
      total_cost_nano: Math.round((data.cost ?? 0) * 1e9),
      total_saved_nano: Math.round((data.cost_saved ?? 0) * 1e9),
      unknown_cost_requests: data.cost == null ? 1 : 0,
    };
    for (const scope of [
      "billing:v1:stats:" + today,
      ...(data.userId
        ? ["billing:v1:user_stats:" + data.userId + ":" + today]
        : []),
    ])
      for (const [field, value] of Object.entries(values))
        await redis.hincrby(scope, field, value);
    for (const scope of [
      "billing:v1:request_logs",
      ...(data.userId ? ["billing:v1:request_logs:" + data.userId] : []),
    ]) {
      await redis.lpush(scope, JSON.stringify(entry));
      await redis.ltrim(scope, 0, 99);
    }
    if (data.userId) {
      await redis.lpush(
        "audit_log:" + data.userId,
        JSON.stringify({
          event: data.is_error ? "api_error" : "api_request",
          timestamp: Date.now(),
          provider: data.provider,
          model: data.model,
        }),
      );
      await redis.ltrim("audit_log:" + data.userId, 0, 99);
      await redis.lpush(
        "latency_log:" + data.userId,
        JSON.stringify({ latency: data.latency, timestamp: Date.now() }),
      );
      await redis.ltrim("latency_log:" + data.userId, 0, 99);
    }
  } catch {
    /* Operational counters are best effort; never return storage details or provider credentials. */
  }
}
function complexity(messages: Message[]): "simple" | "complex" {
  const last = messages.at(-1)!.content;
  return messages.length > 6 ||
    /```|function |def |class |analy[sz]e|code|debug|compare|evaluate|create|build|design|implement|algorithm|architecture|step by step|comprehensive|system design/i.test(
      last,
    ) ||
    last.split(/\s+/).length >= 25
    ? "complex"
    : "simple";
}
function rateHeaders(count: number) {
  return {
    "Cache-Control": "no-store",
    "X-RateLimit-Remaining": String(Math.max(0, RATE_LIMIT - count)),
    "X-RateLimit-Limit": String(RATE_LIMIT),
  };
}
async function callProvider(
  provider: Provider,
  model: string,
  key: string,
  messages: Message[],
  signal: AbortSignal,
) {
  const request = providerRequest(provider, model, key, messages, 1024);
  let response: Response;
  try {
    response = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(request.body),
      redirect: "error",
      signal,
    });
  } catch {
    throw new AccessError(
      signal.aborted ? 504 : 502,
      signal.aborted
        ? "Provider request timed out or was cancelled."
        : "Provider connection failed.",
    );
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    return { status: response.status, data: null };
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new AccessError(
      signal.aborted ? 504 : 502,
      signal.aborted
        ? "Provider request timed out or was cancelled."
        : "Invalid provider response.",
    );
  }
  if (!record(data) || !validResponse(provider, data))
    throw new AccessError(502, "Invalid provider response.");
  return { status: 200, data };
}
export async function POST(req: Request) {
  const start = Date.now();
  let userId: string | undefined;
  let provider: Provider | undefined;
  try {
    const input = proxyInput(await readJson(req));
    provider = input.provider;
    if (input.tsKey !== undefined) userId = await keyOwner(redis, input.tsKey);
    const budget = await consumeRateLimit(
      redis,
      rateLimitScope(userId, provider, input.apiKey),
      RATE_LIMIT,
      60,
    );
    const headers = rateHeaders(budget.count);
    if (!budget.allowed)
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 60 requests per minute." },
        {
          status: 429,
          headers: { ...headers, "Retry-After": String(budget.retryAfter) },
        },
      );
    const level = complexity(input.messages),
      model =
        input.model ??
        MODELS[provider][input.quality === "max_quality" ? "complex" : level];
    const cacheKey =
      "accounting:v1:" +
      (userId ? "account:" + userId + ":" : "anonymous:") +
      privateCacheKey(
        input.messages,
        provider,
        model,
        input.quality,
        input.apiKey,
      );
    let cached: unknown;
    try {
      const raw = await redis?.get(cacheKey);
      cached = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      cached = null;
    }
    if (
      record(cached) &&
      cached.version === 1 &&
      record(cached.data) &&
      validResponse(provider, cached.data) &&
      record(cached.accounting) &&
      (cached.accounting.cost === null ||
        (typeof cached.accounting.cost === "number" &&
          Number.isFinite(cached.accounting.cost) &&
          cached.accounting.cost >= 0))
    ) {
      const meta = cacheAccounting(cached.accounting);
      const latency = Date.now() - start;
      await logRequest({
        ...meta,
        provider,
        model: meta.model_used,
        cache_hit: true,
        userId,
        latency,
        tags: input.tags,
      });
      return NextResponse.json(
        {
          ...cached.data,
          tokensave_meta: {
            ...meta,
            request_id: crypto.randomUUID(),
            cache_hit: true,
            method: "cache",
            quality_mode: input.quality,
            latency_ms: latency,
            tags: input.tags,
          },
        },
        { headers },
      );
    }
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(30000)]);
    const attempts: [Provider, string][] = [
      [provider, input.apiKey],
      ...(["groq", "anthropic", "openai", "google"] as Provider[])
        .filter((p) => p !== provider && input.fallbackKeys[p])
        .map((p) => [p, input.fallbackKeys[p]] as [Provider, string]),
    ];
    let status = 502;
    for (const [active, key] of attempts) {
      const selected =
        active === provider
          ? model
          : MODELS[active][input.quality === "max_quality" ? "complex" : level];
      const result = await callProvider(
        active,
        selected,
        key,
        input.messages,
        signal,
      );
      status = result.status;
      if (!result.data) {
        if ([429, 500, 502, 503, 504, 529].includes(status)) continue;
        break;
      }
      const meta = accounting(active, selected, result.data),
        latency = Date.now() - start,
        isFallback = active !== provider;
      if (!isFallback)
        try {
          await redis?.setex(
            cacheKey,
            CACHE_TTL,
            JSON.stringify({ version: 1, data: result.data, accounting: meta }),
          );
        } catch {}
      await logRequest({
        ...meta,
        provider: active,
        model: meta.model_used,
        cache_hit: false,
        userId,
        latency,
        tags: input.tags,
        fallback: isFallback,
        original_provider: provider,
      });
      return NextResponse.json(
        {
          ...result.data,
          tokensave_meta: {
            ...meta,
            request_id: crypto.randomUUID(),
            cache_hit: false,
            complexity: level,
            chars_saved: 0,
            quality_mode: input.quality,
            latency_ms: latency,
            method: isFallback
              ? "fallback"
              : level === "simple"
                ? "routed_to_cheap"
                : "routed_to_smart",
            tags: input.tags,
            ...(isFallback
              ? { original_provider: provider, fallback_provider: active }
              : {}),
          },
        },
        { headers },
      );
    }
    await logRequest({
      is_error: true,
      provider,
      userId,
      latency: Date.now() - start,
      error_code: status,
    });
    return NextResponse.json(
      { error: "Provider request failed.", provider_status: status },
      { status: status >= 400 && status <= 599 ? status : 502, headers },
    );
  } catch (error) {
    await logRequest({
      is_error: true,
      provider,
      userId,
      latency: Date.now() - start,
    });
    return accessResponse(error);
  }
}
export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "TokenSave API Proxy",
    version: "3.1.0",
    docs: "https://tokensave.in/docs",
    providers: Object.keys(MODELS),
    supported_models: Object.values(MODELS).flatMap((m) => [
      m.simple,
      m.complex,
    ]),
    rate_limit: "60 requests/minute",
    features: [
      "Credential-isolated exact-match caching",
      "Provider usage with published-rate cost estimates",
      "Provider fallback",
      "Account-scoped analytics",
    ],
  });
}
