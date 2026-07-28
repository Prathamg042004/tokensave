import { NextRequest, NextResponse } from "next/server";

import { getRedis, requireApiKey } from "@/app/lib/auth";

// Audit log reader.
//
// The previous version accepted any header that merely started with
// "Bearer ts_live_", so an invented string was enough to read every account's
// audit trail. The key is now verified against Redis and callers only ever see
// the entries belonging to their own account.

const MAX_ENTRIES = 100;
const SCAN_DEPTH = 999;

type AuditEntry = Record<string, unknown> & { userId?: string };

function parseEntry(raw: unknown): AuditEntry | null {
    try {
          const value = typeof raw === "string" ? JSON.parse(raw) : raw;
          return value && typeof value === "object" ? (value as AuditEntry) : null;
    } catch {
          return null;
    }
}

export async function GET(req: NextRequest) {
    const auth = await requireApiKey(req);
    if (!auth.ok) {
          return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

  const redis = getRedis();
    if (!redis) {
          return NextResponse.json({ service: "TokenSave Audit Log", total: 0, entries: [] });
    }

  try {
        const raw = (await redis.lrange("audit_log", 0, SCAN_DEPTH)) || [];
        const entries = raw
          .map(parseEntry)
          .filter((entry): entry is AuditEntry => entry !== null && entry.userId === auth.auth.userId)
          .slice(0, MAX_ENTRIES);

      return NextResponse.json({
              service: "TokenSave Audit Log",
              total: entries.length,
              entries,
      });
  } catch {
        // Never echo the raw error: it can carry the Redis connection string.
      return NextResponse.json({ error: "Could not read the audit log right now" }, { status: 500 });
  }
}
