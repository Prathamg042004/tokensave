const fs = require('fs');

const healthCode = `import { NextResponse } from "next/server";
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
`;

const auditCode = `import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export async function GET(req) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ts_live_")) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return NextResponse.json({ entries: [] });
    const redis = new Redis({ url, token });
    const logs = await redis.lrange("audit_log", 0, 99) || [];
    const parsed = logs.map((l) => { try { return typeof l === "string" ? JSON.parse(l) : l; } catch { return l; } });
    return NextResponse.json({ service: "TokenSave Audit Log", total: parsed.length, entries: parsed });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
`;

fs.writeFileSync('app/api/health/route.ts', healthCode);
console.log('health route fixed');

fs.writeFileSync('app/api/audit/route.ts', auditCode);
console.log('audit route fixed');