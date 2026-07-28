import { NextRequest, NextResponse } from "next/server";
import type { Redis } from "@upstash/redis";

import { getRedis, requireSupabaseUser } from "@/app/lib/auth";
import { generateApiKey, hashApiKey } from "@/lib/security.mjs";

// Issue and rotate TokenSave API keys.
//
// This endpoint used to accept a userId in the request body and return that
// account's live key to anyone who asked, with keys built from Math.random().
// Now the account comes from a verified Supabase session and keys come from the
// platform CSPRNG.

type Minted = { key: string; created: number };

async function mintKey(
  redis: Redis,
  userId: string,
  email: string,
  rotated: boolean,
): Promise<Minted> {
  const key = generateApiKey();
  const created = Date.now();
  const record = { userId, email, created, rotated };

  // user_key is what the dashboard reads back for display. key_hash is the index
  // every authenticated request is checked against, so a lookup never needs the
  // raw value.
  await redis.set("user_key:" + userId, key);
  await redis.set("key_hash:" + (await hashApiKey(key)), JSON.stringify(record));

  return { key, created };
}

export async function POST(req: NextRequest) {
  const session = await requireSupabaseUser(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ error: "Key storage is unavailable" }, { status: 503 });
  }

  const userId = session.auth.id;
  const email = session.auth.email || "";

  let action = "";
  try {
    const body = await req.json();
    if (body && typeof body.action === "string") action = body.action;
  } catch {
    // An empty body simply means "give me my current key".
  }

  try {
    if (action === "rotate") {
      const previous = await redis.get("user_key:" + userId);
      if (typeof previous === "string" && previous.length > 0) {
        // Revoke the old key everywhere it is indexed before minting a new one.
        await Promise.all([
          redis.del("key_owner:" + previous),
          redis.del("key_hash:" + (await hashApiKey(previous))),
        ]);
      }
      const minted = await mintKey(redis, userId, email, true);
      return NextResponse.json({ key: minted.key, created: minted.created, rotated: true });
    }

    const existing = await redis.get("user_key:" + userId);
    if (typeof existing === "string" && existing.length > 0) {
      return NextResponse.json({ key: existing });
    }

    const minted = await mintKey(redis, userId, email, false);
    return NextResponse.json({ key: minted.key, created: minted.created });
  } catch {
    // Never echo the raw error: it can carry connection strings.
    return NextResponse.json({ error: "Could not issue a key right now" }, { status: 500 });
  }
}
