import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: any = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "3.1.0",
    services: {},
  };

  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      const redis = new Redis({ url, token });
      const start = Date.now();
      await redis.ping();
      checks.services.redis = { status: "connected", latency_ms: Date.now() - start };
    } else {
      checks.services.redis = { status: "not_configured" };
      checks.status = "degraded";
    }
  } catch (e: any) {
    checks.services.redis = { status: "error", message: e.message };
    checks.status = "degraded";
  }

  try {
    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supaUrl && supaKey) {
      const start = Date.now();
      const res = await fetch(supaUrl + "/rest/v1/", { headers: { apikey: supaKey } });
      checks.services.supabase = { status: res.ok ? "connected" : "error", latency_ms: Date.now() - start };
    } else {
      checks.services.supabase = { status: "not_configured" };
    }
  } catch (e: any) {
    checks.services.supabase = { status: "error", message: e.message };
  }

  checks.services.proxy = { status: "running" };
  return NextResponse.json(checks, { status: checks.status === "healthy" ? 200 : 503 });
}