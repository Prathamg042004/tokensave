import { requireUser, assertOwner, accessResponse, readJson } from "../../lib/security.mjs";
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

let redis: any = null;
try {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  });
} catch (e) {}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    assertOwner(body.userId, user.id);
    body.userId = user.id;
    body.email = user.email;
    const { userId, action } = body;

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    if (action === "create") {
      return NextResponse.json({error:"Webhook delivery is disabled pending safe egress validation."},{status:501});
    }
    if (action === "delete") {
      if (redis) await redis.del("webhook:" + userId);
      return NextResponse.json({ deleted: true });
    }

    if (action === "test") {
      return NextResponse.json({ error: "Webhook delivery is disabled pending safe egress validation." }, {status:501});
    }

    if (redis) {
      const existing = await redis.get("webhook:" + userId);
      if (existing) {
        const webhook = typeof existing === "string" ? JSON.parse(existing) : existing;
        return NextResponse.json({ webhook });
      }
    }

    return NextResponse.json({ webhook: null });
  } catch (error: any) {
    return accessResponse(error);
  }
}

export async function GET() {
  return NextResponse.json({
    service: "TokenSave Webhooks",
    description: "Webhook delivery is disabled pending safe egress validation.",
    delivery_enabled: false,
    supported_events: ["request_completed", "error", "budget_alert", "cache_hit", "fallback_triggered"],
    usage: { method: "POST", body: { userId: "your-user-id", action: "create | delete | test", webhookUrl: "https://your-server.com/webhook", events: ["request_completed", "error"] } },
  });
}
