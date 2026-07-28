import { NextRequest, NextResponse } from "next/server";

import { getRedis, requireApiKey } from "@/app/lib/auth";

// Anonymous usage counters reported by the SDK.
//
// Writes used to be unauthenticated and unbounded, so anyone who found the URL
// could inflate or corrupt the daily numbers the dashboard renders. A valid
// TokenSave key is now required and every increment is range-checked before it
// reaches Redis.

const MAX_INCREMENT = 100000;

function counter(value: unknown): number {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.min(Math.floor(parsed), MAX_INCREMENT);
}

export async function POST(req: NextRequest) {
    const auth = await requireApiKey(req);
    if (!auth.ok) {
          return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

  const redis = getRedis();
    if (!redis) {
          return NextResponse.json({ error: "Analytics storage is unavailable" }, { status: 503 });
    }

  let body: Record<string, unknown>;
    try {
          body = (await req.json()) as Record<string, unknown>;
    } catch {
          return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
    }

  const requests = counter(body.requests);
    const tokensSaved = counter(body.tokensSaved);
    // A cache hit implies a request, so the hit count can never exceed it.
  const cacheHits = Math.min(counter(body.cacheHits), requests);

  if (requests === 0 && tokensSaved === 0) {
        return NextResponse.json({ received: true, applied: false });
  }

  const today = new Date().toISOString().split("T")[0];
    const dayKey = "stats:" + today;
    const userKey = "user_stats:" + auth.auth.userId + ":" + today;

  try {
        await Promise.all([
                redis.hincrby(dayKey, "total_requests", requests),
                redis.hincrby(dayKey, "cache_hits", cacheHits),
                redis.hincrby(dayKey, "tokens_saved", tokensSaved),
                redis.hincrby(userKey, "requests", requests),
                redis.hincrby(userKey, "tokens_saved", tokensSaved),
              ]);
        return NextResponse.json({ received: true, applied: true });
  } catch {
        return NextResponse.json({ received: false }, { status: 500 });
  }
}

export async function GET() {
    return NextResponse.json({
          service: "TokenSave Anonymous Analytics",
          description: "Receives only anonymous usage counts. No API keys, prompts, or responses are ever sent.",
          data_collected: ["request_count", "cache_hit_count", "tokens_saved_count", "provider_name"],
          data_not_collected: ["api_keys", "prompts", "responses", "user_data", "ip_addresses"],
    });
}
