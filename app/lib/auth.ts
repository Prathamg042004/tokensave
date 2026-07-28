import { Redis } from "@upstash/redis";

import { extractBearerToken, hashApiKey, isWellFormedApiKey } from "@/lib/security.mjs";

// Server-side authentication helpers shared by the API routes.
//
// Two kinds of caller exist:
//   1. a program holding a TokenSave API key  -> requireApiKey
//   2. a signed-in browser session            -> requireSupabaseUser
//
// Neither is allowed to tell us who it is. Identity always comes from something
// verifiable: a key that exists in Redis, or a token the Supabase auth server
// confirms. Routes used to read body.userId and trust it, which meant any caller
// could act as any account.

export type KeyRecord = {
  userId: string;
  email?: string;
  created?: number;
  rotated?: boolean;
};

export type ApiKeyAuth = {
  key: string;
  keyHash: string;
  userId: string;
  email?: string;
};

export type SupabaseUser = {
  id: string;
  email?: string;
};

export type AuthFailure = { ok: false; status: number; error: string };
export type AuthResult<T> = { ok: true; auth: T } | AuthFailure;

let redisClient: Redis | null | undefined;

/** Lazily build one Redis client per runtime, or null when unconfigured. */
export function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redisClient = url && token ? new Redis({ url, token }) : null;
  return redisClient;
}

function parseKeyRecord(raw: unknown): KeyRecord | null {
  if (!raw) return null;
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (value && typeof value.userId === "string" && value.userId.length > 0) {
      return value as KeyRecord;
    }
    return null;
  } catch {
    return null;
  }
}

/** Read a TokenSave key from either the Authorization or X-API-Key header. */
export function readApiKey(req: Request): string | null {
  const bearer = extractBearerToken(req.headers.get("authorization"));
  const candidate = bearer || req.headers.get("x-api-key");
  const trimmed = typeof candidate === "string" ? candidate.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolve a key to its owner, or null when the key does not exist.
 *
 * New keys are indexed by SHA-256. Keys minted before that are indexed by their
 * raw value, so those are looked up as a fallback and migrated on first read -
 * existing integrations keep working without a forced rotation.
 */
export async function lookupApiKey(key: string): Promise<ApiKeyAuth | null> {
  if (!isWellFormedApiKey(key)) return null;
  const redis = getRedis();
  if (!redis) return null;

  const keyHash = await hashApiKey(key);
  let record = parseKeyRecord(await redis.get("key_hash:" + keyHash).catch(() => null));

  if (!record) {
    record = parseKeyRecord(await redis.get("key_owner:" + key).catch(() => null));
    if (record) {
      await redis.set("key_hash:" + keyHash, JSON.stringify(record)).catch(() => {});
    }
  }

  if (!record) return null;
  return { key, keyHash, userId: record.userId, email: record.email };
}

/** Gate a route behind a real TokenSave key. */
export async function requireApiKey(req: Request): Promise<AuthResult<ApiKeyAuth>> {
  const key = readApiKey(req);
  if (!key) {
    return {
      ok: false,
      status: 401,
      error: "Missing key. Send it as: Authorization: Bearer ts_live_...",
    };
  }
  if (!getRedis()) {
    return { ok: false, status: 503, error: "Key storage is unavailable" };
  }
  const auth = await lookupApiKey(key);
  if (!auth) {
    return { ok: false, status: 401, error: "Invalid or revoked TokenSave key" };
  }
  return { ok: true, auth };
}

/**
 * Gate a route behind a signed-in Supabase session.
 *
 * The access token is verified by asking the Supabase auth server who it belongs
 * to. That needs only the public anon key, so no service-role secret has to be
 * reachable from request handling.
 */
export async function requireSupabaseUser(req: Request): Promise<AuthResult<SupabaseUser>> {
  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Sign in first, then send your session token as: Authorization: Bearer <access_token>",
    };
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!rawUrl || !anonKey) {
    return { ok: false, status: 503, error: "Authentication is not configured on this deployment" };
  }
  const baseUrl = rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;

  try {
    const res = await fetch(baseUrl + "/auth/v1/user", {
      headers: { Authorization: "Bearer " + token, apikey: anonKey },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { ok: false, status: 401, error: "Session is invalid or has expired" };
    }
    const user = await res.json();
    if (!user || typeof user.id !== "string") {
      return { ok: false, status: 401, error: "Session is invalid or has expired" };
    }
    return {
      ok: true,
      auth: { id: user.id, email: typeof user.email === "string" ? user.email : undefined },
    };
  } catch {
    return { ok: false, status: 503, error: "Could not verify the session right now" };
  }
}
