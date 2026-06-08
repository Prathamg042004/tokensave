import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export async function GET() {
  try {
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
      });
    }

    const totals = days.reduce((acc, d) => ({
      total_requests: acc.total_requests + d.total_requests,
      tokens_saved: acc.tokens_saved + d.tokens_saved,
      cache_hits: acc.cache_hits + d.cache_hits,
    }), { total_requests: 0, tokens_saved: 0, cache_hits: 0 });

    const logs = await redis.lrange("request_logs", 0, 19) || [];
    const parsedLogs = logs.map((log) => {
      try { return typeof log === "string" ? JSON.parse(log) : log; } catch { return log; }
    });

    return NextResponse.json({ days, totals, recent_logs: parsedLogs });
  } catch (error) {
    return NextResponse.json({
      days: [],
      totals: { total_requests: 0, tokens_saved: 0, cache_hits: 0 },
      recent_logs: [],
    });
  }
}