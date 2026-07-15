import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

let redis: any = null;
try {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  });
} catch (e) {}

export async function GET() {
  try {
    if (!redis) return NextResponse.json({ days: [], totals: { total_requests: 0, tokens_saved: 0, cache_hits: 0 }, recent_logs: [] });

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const stats = await redis.hgetall("stats:" + key) || {};
      days.push({
        date: key,
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        total_requests: Number(stats.total_requests || 0),
        tokens_saved: Number(stats.tokens_saved || 0),
        cache_hits: Number(stats.cache_hits || 0),
        total_input_tokens: Number(stats.total_input_tokens || 0),
        total_output_tokens: Number(stats.total_output_tokens || 0),
        errors: Number(stats.errors || 0),
        total_cost: Number(stats.total_cost_micro || 0) / 1000000,
        total_saved: Number(stats.total_saved_micro || 0) / 1000000,
      });
    }

    const totals = days.reduce((acc, d) => ({
      total_requests: acc.total_requests + d.total_requests,
      tokens_saved: acc.tokens_saved + d.tokens_saved,
      cache_hits: acc.cache_hits + d.cache_hits,
      total_input_tokens: acc.total_input_tokens + d.total_input_tokens,
      total_output_tokens: acc.total_output_tokens + d.total_output_tokens,
      errors: acc.errors + d.errors,
      total_cost: acc.total_cost + d.total_cost,
      total_saved: acc.total_saved + d.total_saved,
    }), { total_requests: 0, tokens_saved: 0, cache_hits: 0, total_input_tokens: 0, total_output_tokens: 0, errors: 0, total_cost: 0, total_saved: 0 });

    const logs = await redis.lrange("request_logs", 0, 49) || [];
    const parsedLogs = logs.map((log: any) => {
      try { return typeof log === "string" ? JSON.parse(log) : log; } catch { return log; }
    });

    let latencies: number[] = [];
    try {
      const latencyLogs = await redis.lrange("latency_log", 0, 49) || [];
      latencies = latencyLogs.map((l: any) => {
        try { const parsed = typeof l === "string" ? JSON.parse(l) : l; return parsed.latency; } catch { return 0; }
      }).filter((l: number) => l > 0);
    } catch (e) {}

    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length) : 0;
    const p95Latency = latencies.length > 0 ? latencies.sort((a: number, b: number) => a - b)[Math.floor(latencies.length * 0.95)] : 0;
    const errorRate = totals.total_requests > 0 ? Math.round((totals.errors / totals.total_requests) * 100) : 0;

    return NextResponse.json({
      days,
      totals,
      recent_logs: parsedLogs,
      performance: {
        avg_latency_ms: avgLatency,
        p95_latency_ms: p95Latency,
        error_rate_percent: errorRate,
        cache_hit_rate: totals.total_requests > 0 ? Math.round((totals.cache_hits / totals.total_requests) * 100) : 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      days: [], totals: { total_requests: 0, tokens_saved: 0, cache_hits: 0 }, recent_logs: [], performance: {},
    });
  }
}