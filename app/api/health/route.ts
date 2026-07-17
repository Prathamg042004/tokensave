import { NextResponse } from "next/server";
import { getRedis } from "../../redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: any = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "3.0.0",
    uptime: process.uptime(),
    services: {},
  };

  // Check Redis
  try {
    const redis = getRedis();
    if (redis) {
      const start = Date.now();
      await redis.ping();
      checks.services.redis = {
        status: "connected",
        latency_ms: Date.now() - start,
      };
    } else {
      checks.services.redis = { status: "not_configured" };
      checks.status = "degraded";
    }
  } catch (e: any) {
    checks.services.redis = { status: "error", message: e.message };
    checks.status = "degraded";
  }

  // Check Supabase
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const start = Date.now();
      const res = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/", {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "" },
      });
      checks.services.supabase = {
        status: res.ok ? "connected" : "error",
        latency_ms: Date.now() - start,
      };
    } else {
      checks.services.supabase = { status: "not_configured" };
    }
  } catch (e: any) {
    checks.services.supabase = { status: "error", message: e.message };
    checks.status = "degraded";
  }

  checks.services.proxy = { status: "running" };
  checks.services.auth = { status: process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "not_configured" };

  const statusCode = checks.status === "healthy" ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}