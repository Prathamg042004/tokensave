import { NextRequest, NextResponse } from "next/server";
import { authenticate, serverError, unauthorized } from "@/lib/auth";
import { getRedis, parseJson, rateLimit } from "@/lib/redis";
import { generateApiKey, hashApiKey, previewOf } from "@/lib/keys";

/**
 * Credential issuing.
 *
 * Before this change the endpoint was unauthenticated and returned the live
 * credential belonging to whatever userId was posted, and credentials were
 * produced with Math.random() and stored in plaintext.
 *
 * Now: the caller must be signed in, the credential comes from a CSPRNG, only
 * its SHA-256 digest is persisted, and the plaintext is shown exactly once.
 */

const ISSUE_LIMIT = 10;
const ISSUE_WINDOW_SECONDS = 3600;

type KeyRecord = {
  hash: string;
  preview: string;
  created: number;
  rotated?: boolean;
};

const recordKeyFor = (userId: string) => "key_record:" + userId;
const ownerKeyFor = (hash: string) => "key_owner_hash:" + hash;

/**
 * Removes credentials written by the previous plaintext scheme. Anything
 * issued by the old endpoint has to be treated as compromised.
 */
async function purgeLegacyRecords(userId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const legacy = await redis.get("user_key:" + userId);
    if (typeof legacy === "string" && legacy.length > 0) {
      await redis.del("key_owner:" + legacy);
    }
    await redis.del("user_key:" + userId);
  } catch {
    /* best effort */
  }
}

async function issue(userId: string, email: string | null, rotated: boolean) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
  }

  const previous = parseJson<KeyRecord>(await redis.get(recordKeyFor(userId)));
  if (previous?.hash) {
    await redis.del(ownerKeyFor(previous.hash));
  }
  await purgeLegacyRecords(userId);

  const apiKey = generateApiKey();
  const hash = await hashApiKey(apiKey);
  const record: KeyRecord = {
    hash,
    preview: previewOf(apiKey),
    created: Date.now(),
    rotated,
  };

  await redis.set(recordKeyFor(userId), JSON.stringify(record));
  await redis.set(
    ownerKeyFor(hash),
    JSON.stringify({ userId, email, created: record.created, revoked: false })
  );

  return NextResponse.json({
    key: apiKey,
    preview: record.preview,
    created: record.created,
    rotated,
    notice: "Store this key now. Only its hash is retained, so it cannot be shown again.",
  });
}

export async function POST(req: NextRequest) {
  const identity = await authenticate(req);
  if (!identity) return unauthorized();

  try {
    const limit = await rateLimit("key-issue:" + identity.userId, ISSUE_LIMIT, ISSUE_WINDOW_SECONDS);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many key operations. Try again later." },
        { status: 429, headers: { "Retry-After": String(ISSUE_WINDOW_SECONDS) } }
      );
    }

    const redis = getRedis();
    if (!redis) {
      return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
    }

    let action = "create";
    try {
      const body = await req.json();
      if (body && typeof body.action === "string") action = body.action;
    } catch {
      /* an empty body means the default action */
    }

    if (action === "rotate") {
      return issue(identity.userId, identity.email, true);
    }

    if (action === "revoke") {
      const existing = parseJson<KeyRecord>(await redis.get(recordKeyFor(identity.userId)));
      if (existing?.hash) await redis.del(ownerKeyFor(existing.hash));
      await redis.del(recordKeyFor(identity.userId));
      await purgeLegacyRecords(identity.userId);
      return NextResponse.json({ revoked: true });
    }

    if (action !== "create") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    const existing = parseJson<KeyRecord>(await redis.get(recordKeyFor(identity.userId)));
    if (existing?.hash) {
      return NextResponse.json({
        key: null,
        preview: existing.preview,
        created: existing.created,
        notice: "A key already exists. Rotate it to receive a new one; the old value cannot be recovered.",
      });
    }

    return issue(identity.userId, identity.email, false);
  } catch (error) {
    return serverError("generate-key", error);
  }
}

/** Metadata only. The plaintext credential is never returned by a read. */
export async function GET(req: NextRequest) {
  const identity = await authenticate(req);
  if (!identity) return unauthorized();

  try {
    const redis = getRedis();
    if (!redis) return NextResponse.json({ key: null, preview: null });

    const existing = parseJson<KeyRecord>(await redis.get(recordKeyFor(identity.userId)));
    if (!existing?.hash) return NextResponse.json({ key: null, preview: null });

    return NextResponse.json({
      key: null,
      preview: existing.preview,
      created: existing.created,
      rotated: Boolean(existing.rotated),
    });
  } catch (error) {
    return serverError("generate-key:get", error);
  }
}
