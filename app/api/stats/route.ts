import { NextRequest, NextResponse } from "next/server";
import { authenticate, serverError, unauthorized } from "@/lib/auth";
import { getRedis, parseJson } from "@/lib/redis";

/**
 * Usage analytics.
 *
 * This route used to be public and returned deployment-wide counters plus the
 * last 50 raw request logs, including providers, models, costs and upstream
 * error messages for every account. It now requires a credential and only
 * reports the caller's own activity.
 */

const DAYS = 7;
const MAX_LOGS = 50;

type RequestLog = {
  userId?: string;
  cache_hit?: boolean;
  tokens_saved?: number;
  provider?: string;
  model?: string;
  complexity?: string;
  latency?: number;
  is_error?: boolean;
  input_tokens?: number;
  output_tokens?: number;
  cost?: number;
  cost_saved?: number;
  timestamp?: number;
  id?: string;
};

type DayBucket = {
  date: string;
  label: string;
  total_requests: number;
  tokens_saved: number;
  cache_hits: number;
  total_input_tokens: number;
  total_output_tokens: number;
  errors: number;
  total_cost: number;
  total_saved: number;
};

function emptyDay(date: string, label: string): DayBucket {
  return {
    date,
    label,
    total_requests: 0,
    tokens_saved: 0,
    cache_hits: 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    errors: 0,
    total_cost: 0,
    total_saved: 0,
  };
}

export async function GET(req: NextRequest) {
  const identity = await authenticate(req);
  if (!identity) return unauthorized();

  try {
    const redis = getRedis();
    const days: DayBucket[] = [];

    for (let offset = DAYS - 1; offset >= 0; offset--) {
      const day = new Date();
      day.setDate(day.getDate() - offset);
      const date = day.toISOString().split("T")[0];
      const label = day.toLocaleDateString("en-US", { weekday: "short" });
      const bucket = emptyDay(date, label);

      if (redis) {
        const stats = ((await redis.hgetall("user_stats:" + identity.userId + ":" + date)) ||
          {}) as Record<string, string>;
        bucket.total_requests = Number(stats.requests || 0);
        bucket.tokens_saved = Number(stats.tokens_saved || 0);
        bucket.cache_hits = Number(stats.cache_hits || 0);
        bucket.total_input_tokens = Number(stats.input_tokens || 0);
        bucket.total_output_tokens = Number(stats.output_tokens || 0);
        bucket.errors = Number(stats.errors || 0);
        bucket.total_cost = Number(stats.cost_micro || 0) / 1000000;
        bucket.total_saved = Number(stats.saved_micro || 0) / 1000000;
      }

      days.push(bucket);
    }

    const totals = days.reduce(
      (acc, day) => ({
        total_requests: acc.total_requests + day.total_requests,
        tokens_saved: acc.tokens_saved + day.tokens_saved,
        cache_hits: acc.cache_hits + day.cache_hits,
        total_input_tokens: acc.total_input_tokens + day.total_input_tokens,
        total_output_tokens: acc.total_output_tokens + day.total_output_tokens,
        errors: acc.errors + day.errors,
        total_cost: acc.total_cost + day.total_cost,
        total_saved: acc.total_saved + day.total_saved,
      }),
      {
        total_requests: 0,
        tokens_saved: 0,
        cache_hits: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        errors: 0,
        total_cost: 0,
        total_saved: 0,
      }
    );

    let ownLogs: RequestLog[] = [];
    if (redis) {
      const raw = (await redis.lrange("request_logs", 0, 999)) || [];
      ownLogs = raw
        .map((line) => parseJson<RequestLog>(line))
        .filter((log): log is RequestLog => log !== null && log.userId === identity.userId)
        .slice(0, MAX_LOGS);
    }

    // Upstream error text is deliberately dropped: it has carried provider
    // account details in the past.
    const recentLogs = ownLogs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      provider: log.provider,
      model: log.model,
      complexity: log.complexity,
      cache_hit: Boolean(log.cache_hit),
      is_error: Boolean(log.is_error),
      latency: log.latency,
      input_tokens: log.input_tokens,
      output_tokens: log.output_tokens,
      tokens_saved: log.tokens_saved,
      cost: log.cost,
      cost_saved: log.cost_saved,
    }));

    const latencies = ownLogs
      .map((log) => Number(log.latency || 0))
      .filter((value) => value > 0)
      .sort((a, b) => a - b);

    const avgLatency =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;
    const p95Latency =
      latencies.length > 0 ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))] : 0;

    return NextResponse.json(
      {
        scope: "account",
        days,
        totals,
        recent_logs: recentLogs,
        performance: {
          avg_latency_ms: avgLatency,
          p95_latency_ms: p95Latency,
          error_rate_percent:
            totals.total_requests > 0 ? Math.round((totals.errors / totals.total_requests) * 100) : 0,
          cache_hit_rate:
            totals.total_requests > 0 ? Math.round((totals.cache_hits / totals.total_requests) * 100) : 0,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return serverError("stats", error);
  }
}
