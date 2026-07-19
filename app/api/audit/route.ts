import { NextRequest, NextResponse } from "next/server";
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
