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
    const body = await req.json();
    const { userId, action, webhookUrl, events } = body;

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    if (action === "create") {
      if (!webhookUrl) return NextResponse.json({ error: "webhookUrl required" }, { status: 400 });
      const webhook = {
        id: "wh_" + Date.now().toString(36),
        url: webhookUrl,
        events: events || ["request_completed", "error", "budget_alert"],
        created: Date.now(),
        active: true,
      };
      if (redis) {
        await redis.set("webhook:" + userId, JSON.stringify(webhook));
      }
      return NextResponse.json({ webhook });
    }

    if (action === "delete") {
      if (redis) await redis.del("webhook:" + userId);
      return NextResponse.json({ deleted: true });
    }

    if (action === "test") {
      if (!webhookUrl) return NextResponse.json({ error: "webhookUrl required" }, { status: 400 });
      try {
        const testRes = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "test", message: "TokenSave webhook test successful", timestamp: Date.now() }),
        });
        return NextResponse.json({ success: testRes.ok, status: testRes.status });
      } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
      }
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "TokenSave Webhooks",
    description: "Receive notifications for API events",
    supported_events: ["request_completed", "error", "budget_alert", "cache_hit", "fallback_triggered"],
    usage: { method: "POST", body: { userId: "your-user-id", action: "create | delete | test", webhookUrl: "https://your-server.com/webhook", events: ["request_completed", "error"] } },
  });
}