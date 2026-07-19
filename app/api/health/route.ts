import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = { status: "healthy", timestamp: new Date().toISOString(), version: "3.1.0", services: {} };
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      const redis = new Redis({ url, token });
      const start = Date.now();
      await redis.ping();
      checks.services.redis = { status: "connected", latency_ms: Date.now() - start };
    } else { checks.services.redis = { status: "not_configured" }; checks.status = "degraded"; }
  } catch (e) { checks.services.redis = { status: "error", message: e.message }; checks.status = "degraded"; }
  checks.services.proxy = { status: "running" };
  return NextResponse.json(checks, { status: checks.status === "healthy" ? 200 : 503 });
}
