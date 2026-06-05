import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const stats = await redis.hgetall("stats:" + today) || {};
    const logs = await redis.lrange("request_logs", 0, 19) || [];

    const parsedLogs = logs.map((log: any) => {
      try { return typeof log === "string" ? JSON.parse(log) : log; } catch { return log; }
    });

    return NextResponse.json({
      today: {
        total_requests: Number(stats.total_requests || 0),
        tokens_saved: Number(stats.tokens_saved || 0),
        cache_hits: Number(stats.cache_hits || 0),
      },
      recent_logs: parsedLogs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
