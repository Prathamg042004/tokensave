import { keyOwner, accessResponse } from "../../lib/security.mjs";
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export async function GET(req: any) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ts_live_")) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return NextResponse.json({error:"Storage unavailable"},{status:503});
    const redis = new Redis({ url, token });
    const userId = await keyOwner(redis, auth.slice(7));
    const logs = await redis.lrange("audit_log:" + userId, 0, 99) || [];
    const parsed = logs.map((l) => { try { return typeof l === "string" ? JSON.parse(l) : l; } catch { return l; } });
    return NextResponse.json({ service: "TokenSave Audit Log", total: parsed.length, entries: parsed });
  } catch (e:any) { return accessResponse(e); }
}
