import { NextRequest, NextResponse } from "next/server";
import { authenticate, serverError, unauthorized } from "@/lib/auth";
import { getRedis, parseJson, rateLimit } from "@/lib/redis";
import { deliverWebhook, validateOutboundUrl } from "@/lib/ssrf";

/**
 * Webhook registration.
 *
 * CodeQL alert #1: the "test" action fetched an arbitrary caller-supplied URL,
 * which let anyone use this deployment to probe internal services. The URL is
 * now validated, the target must be public https, redirects are not followed,
 * and only the authenticated owner can register or test a webhook.
 */

const SUPPORTED_EVENTS = [
  "request_completed",
  "error",
  "budget_alert",
  "cache_hit",
  "fallback_triggered",
] as const;

const TEST_LIMIT = 5;
const TEST_WINDOW_SECONDS = 300;

type Webhook = {
  id: string;
  url: string;
  events: string[];
  created: number;
  active: boolean;
};

const webhookKeyFor = (userId: string) => "webhook:" + userId;

function sanitiseEvents(input: unknown): string[] {
  if (!Array.isArray(input)) return ["request_completed", "error", "budget_alert"];
  const allowed = input.filter(
    (event): event is string =>
      typeof event === "string" && (SUPPORTED_EVENTS as readonly string[]).includes(event)
  );
  return allowed.length > 0 ? allowed : ["request_completed"];
}

export async function POST(req: NextRequest) {
  const identity = await authenticate(req);
  if (!identity) return unauthorized();

  try {
    const redis = getRedis();
    if (!redis) return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "A JSON body is required" }, { status: 400 });
    }

    const action = typeof body.action === "string" ? body.action : "get";

    if (action === "create") {
      const verdict = validateOutboundUrl(body.webhookUrl);
      if (!verdict.ok) {
        return NextResponse.json({ error: verdict.reason }, { status: 400 });
      }

      const webhook: Webhook = {
        id: "wh_" + crypto.randomUUID(),
        url: verdict.url.toString(),
        events: sanitiseEvents(body.events),
        created: Date.now(),
        active: true,
      };

      await redis.set(webhookKeyFor(identity.userId), JSON.stringify(webhook));
      return NextResponse.json({ webhook });
    }

    if (action === "delete") {
      await redis.del(webhookKeyFor(identity.userId));
      return NextResponse.json({ deleted: true });
    }

    if (action === "test") {
      const limit = await rateLimit("webhook-test:" + identity.userId, TEST_LIMIT, TEST_WINDOW_SECONDS);
      if (!limit.allowed) {
        return NextResponse.json(
          { error: "Too many webhook tests. Try again shortly." },
          { status: 429, headers: { "Retry-After": String(TEST_WINDOW_SECONDS) } }
        );
      }

      // Only the endpoint already registered by this account can be probed,
      // so the destination is never taken straight from the request body.
      const registered = parseJson<Webhook>(await redis.get(webhookKeyFor(identity.userId)));
      if (!registered?.url) {
        return NextResponse.json(
          { error: "Register a webhook before testing it" },
          { status: 404 }
        );
      }

      const result = await deliverWebhook(registered.url, {
        event: "test",
        message: "TokenSave webhook test",
        timestamp: Date.now(),
      });

      return NextResponse.json({
        success: result.delivered,
        status: result.status ?? null,
        reason: result.reason ?? null,
      });
    }

    if (action !== "get") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    const existing = parseJson<Webhook>(await redis.get(webhookKeyFor(identity.userId)));
    return NextResponse.json({ webhook: existing ?? null });
  } catch (error) {
    return serverError("webhooks", error);
  }
}

export async function GET() {
  return NextResponse.json({
    service: "TokenSave Webhooks",
    description: "Receive notifications for API events",
    authentication: "Bearer <supabase access token> or a TokenSave API key",
    supported_events: SUPPORTED_EVENTS,
    constraints: {
      scheme: "https only",
      port: 443,
      blocked: "loopback, link-local, private and reserved address ranges",
      redirects: "not followed",
      allowlist: "set WEBHOOK_HOST_ALLOWLIST to restrict destinations further",
    },
    usage: {
      method: "POST",
      body: {
        action: "create | delete | test | get",
        webhookUrl: "https://your-server.example.com/hook",
        events: ["request_completed", "error"],
      },
    },
  });
}
