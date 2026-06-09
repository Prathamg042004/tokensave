import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requests, cacheHits, tokensSaved, provider } = body;
    const today = new Date().toISOString().split("T")[0];

    await redis.hincrby("stats:" + today, "total_requests", requests || 0);
    await redis.hincrby("stats:" + today, "cache_hits", cacheHits || 0);
    await redis.hincrby("stats:" + today, "tokens_saved", tokensSaved || 0);

    return NextResponse.json({ received: true });
  } catch (error) {
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