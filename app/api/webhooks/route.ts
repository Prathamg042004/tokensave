import {
  requireUser,
  assertOwner,
  accessResponse,
  readJson,
} from "../../lib/security.mjs";
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;
try {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  });
} catch {}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    assertOwner(body.userId, user.id);
    body.userId = user.id;
    body.email = user.email;
    const userId = user.id,
      action = body.action;
    if (
      action !== undefined &&
      !["get", "delete", "create", "test"].some((a) => a === action)
    )
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    if (!redis)
      return NextResponse.json(
        { error: "Storage unavailable" },
        { status: 503 },
      );

    if (!userId)
      return NextResponse.json({ error: "userId required" }, { status: 400 });

    if (action === "create") {
      return NextResponse.json(
        {
          error: "Webhook delivery is disabled pending safe egress validation.",
        },
        { status: 501 },
      );
    }
    if (action === "delete") {
      if (redis) await redis.del("webhook:" + userId);
      return NextResponse.json(
        { deleted: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (action === "test") {
      return NextResponse.json(
        {
          error: "Webhook delivery is disabled pending safe egress validation.",
        },
        { status: 501 },
      );
    }

    if (redis) {
      const existing = await redis.get("webhook:" + userId);
      if (existing) {
        const webhook =
          typeof existing === "string" ? JSON.parse(existing) : existing;
        return NextResponse.json(
          { webhook },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    return NextResponse.json(
      { webhook: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return accessResponse(error);
  }
}

export async function GET() {
  return NextResponse.json({
    service: "TokenSave Webhooks",
    description: "Webhook delivery is disabled pending safe egress validation.",
    delivery_enabled: false,
    supported_events: [
      "request_completed",
      "error",
      "budget_alert",
      "cache_hit",
      "fallback_triggered",
    ],
    usage: {
      method: "POST",
      body: {
        userId: "your-user-id",
        action: "create | delete | test",
        webhookUrl: "https://your-server.com/webhook",
        events: ["request_completed", "error"],
      },
    },
  });
}
