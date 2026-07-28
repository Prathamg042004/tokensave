import { NextRequest, NextResponse } from "next/server";

import { getRedis, requireSupabaseUser } from "@/app/lib/auth";

// Webhook registration.
//
// Two problems lived here. The owning account came from body.userId, so anyone
// could read, replace or delete another account's webhook. And "test" would
// POST to any URL the caller supplied, which turns the deployment into an open
// proxy against loopback, private and link-local addresses (SSRF). The account
// now comes from a verified session and every URL is screened before it is
// stored or called.

const EVENTS = [
    "request_completed",
    "error",
    "budget_alert",
    "cache_hit",
    "fallback_triggered",
  ] as const;
type WebhookEvent = (typeof EVENTS)[number];

const DEFAULT_EVENTS: WebhookEvent[] = ["request_completed", "error", "budget_alert"];
const TEST_TIMEOUT_MS = 5000;
const MAX_URL_LENGTH = 2048;

const BLOCKED_HOSTS = new Set([
    "localhost",
    "0.0.0.0",
    "metadata.google.internal",
  ]);

/** Accept only public https endpoints. Everything else is a potential SSRF target. */
function safeWebhookUrl(value: unknown): URL | null {
    if (typeof value !== "string" || value.length > MAX_URL_LENGTH) return null;

  let url: URL;
    try {
          url = new URL(value);
    } catch {
          return null;
    }

  if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;

  const host = url.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(host)) return null;
    if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) return null;
    // Any IPv6 literal, which covers ::1 and the unique-local range.
  if (host.includes(":")) return null;

  const octets = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (octets) {
          const first = Number(octets[1]);
          const second = Number(octets[2]);
          if (first === 0 || first === 10 || first === 127) return null;
          if (first === 169 && second === 254) return null;
          if (first === 192 && second === 168) return null;
          if (first === 172 && second >= 16 && second <= 31) return null;
          if (first >= 224) return null;
    }

  return url;
}

function cleanEvents(value: unknown): WebhookEvent[] {
    if (!Array.isArray(value)) return DEFAULT_EVENTS;
    const picked = value.filter((entry): entry is WebhookEvent => EVENTS.includes(entry as WebhookEvent));
    return picked.length > 0 ? Array.from(new Set(picked)) : DEFAULT_EVENTS;
}

export async function POST(req: NextRequest) {
    const session = await requireSupabaseUser(req);
    if (!session.ok) {
          return NextResponse.json({ error: session.error }, { status: session.status });
    }

  const redis = getRedis();
    if (!redis) {
          return NextResponse.json({ error: "Webhook storage is unavailable" }, { status: 503 });
    }

  const storageKey = "webhook:" + session.auth.id;

  let body: Record<string, unknown>;
    try {
          body = (await req.json()) as Record<string, unknown>;
    } catch {
          return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
    }

  const action = typeof body.action === "string" ? body.action : "";

  try {
        if (action === "create") {
                const url = safeWebhookUrl(body.webhookUrl);
                if (!url) {
                          return NextResponse.json({ error: "webhookUrl must be a public https:// address" }, { status: 400 });
                }
                const webhook = {
                          id: "wh_" + Date.now().toString(36),
                          url: url.toString(),
                          events: cleanEvents(body.events),
            created: Date.now(),
                          active: true,
                };
                await redis.set(storageKey, JSON.stringify(webhook));
                return NextResponse.json({ webhook });
        }

      if (action === "delete") {
              await redis.del(storageKey);
              return NextResponse.json({ deleted: true });
      }

      if (action === "test") {
              const url = safeWebhookUrl(body.webhookUrl);
              if (!url) {
                        return NextResponse.json({ error: "webhookUrl must be a public https:// address" }, { status: 400 });
              }
              try {
                        const testRes = await fetch(url, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                                  event: "test",
                                                  message: "TokenSave webhook test successful",
                                                  timestamp: Date.now(),
                                    }),
                                    // Redirects are not followed: they are the simplest way around the host screen.
                                    redirect: "manual",
                                    signal: AbortSignal.timeout(TEST_TIMEOUT_MS),
                        });
                        return NextResponse.json({ success: testRes.ok, status: testRes.status });
              } catch {
                        return NextResponse.json({ success: false, error: "The endpoint did not respond in time" });
              }
      }

      const existing = await redis.get(storageKey);
        if (existing) {
                const webhook = typeof existing === "string" ? JSON.parse(existing) : existing;
                return NextResponse.json({ webhook });
        }

      return NextResponse.json({ webhook: null });
  } catch {
        // Never echo the raw error: it can carry the Redis connection string.
      return NextResponse.json({ error: "Could not complete that webhook action" }, { status: 500 });
  }
}

export async function GET() {
    return NextResponse.json({
          service: "TokenSave Webhooks",
          description: "Receive notifications for API events",
          supported_events: EVENTS,
          usage: {
                  method: "POST",
                  headers: { Authorization: "Bearer <supabase_access_token>" },
                  body: {
                            action: "create | delete | test",
                            webhookUrl: "https://your-server.com/webhook",
                            events: ["request_completed", "error"],
                  },
          },
    });
}
