import { NextRequest, NextResponse } from "next/server";
import { authenticate, serverError, unauthorized } from "@/lib/auth";
import { getRedis, parseJson } from "@/lib/redis";

/**
 * Audit log.
 *
 * The previous check accepted any Authorization header that merely started
 * with "Bearer ts_live_", so any string in that shape read the global log.
 * The credential is now verified and entries are scoped to their owner.
 */

const MAX_ENTRIES = 100;

type AuditEntry = {
  event?: string;
  timestamp?: number;
  provider?: string;
  model?: string;
  cache_hit?: boolean;
  userId?: string;
};

function operatorIds(): string[] {
  return (process.env.AUDIT_OPERATOR_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  const identity = await authenticate(req);
  if (!identity) return unauthorized();

  try {
    const redis = getRedis();
    if (!redis) return NextResponse.json({ service: "TokenSave Audit Log", total: 0, entries: [] });

    const raw = (await redis.lrange("audit_log", 0, 999)) || [];
    const isOperator = operatorIds().includes(identity.userId);

    const entries = raw
      .map((line) => parseJson<AuditEntry>(line))
      .filter((entry): entry is AuditEntry => entry !== null)
      .filter((entry) => isOperator || entry.userId === identity.userId)
      .slice(0, MAX_ENTRIES)
      .map((entry) => ({
        event: entry.event,
        timestamp: entry.timestamp,
        provider: entry.provider,
        model: entry.model,
        cache_hit: entry.cache_hit,
      }));

    return NextResponse.json({
      service: "TokenSave Audit Log",
      scope: isOperator ? "deployment" : "account",
      total: entries.length,
      entries,
    });
  } catch (error) {
    return serverError("audit", error);
  }
}
