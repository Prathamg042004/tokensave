import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export async function POST(req: NextRequest) {
  return NextResponse.json({error:"Client-supplied usage counters are not accepted."},{status:410});
}

export async function GET() {
  return NextResponse.json({
    service: "TokenSave Anonymous Analytics",
    description: "Receives only anonymous usage counts. No API keys, prompts, or responses are ever sent.",
    data_collected: ["request_count", "cache_hit_count", "tokens_saved_count", "provider_name"],
    data_not_collected: ["api_keys", "prompts", "responses", "user_data", "ip_addresses"],
  });
}
