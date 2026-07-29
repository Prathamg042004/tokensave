// test line 1
const a = { b: [1,2] };
import { Redis } from "@upstash/redis";

/**
 * Single shared Upstash client.
 * Previously every route constructed its own client, sometimes with empty
 * credentials, which made failure modes inconsistent across the API surface.
 */
let client: Redis | null = null;
let initialised = false;

export function getRedis(): Redis | null {
  if (initialised) return client;
  initialised = true;

  const url = process.env.UPSTASH_REDIS_REST_URL || "";
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN || "";
  if (!url || !restToken) {
    client = null;
    return client;
  }

  try {
    client = new Redis({ url, token: restToken });
  } catch {
    client = null;
  }
  return client;
}

export async function rGet<T = unknown>(cacheKey: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return (await redis.get(cacheKey)) as T | null;
  } catch {
    return null;
  }
}

export async function rSet(cacheKey: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.setex(cacheKey, ttlSeconds, JSON.stringify(value));
  } catch {
    /* cache writes are best effort */
  }
}

export async function rDel(cacheKey: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(cacheKey);
  } catch {
    /* best effort */
  }
}

export async function rIncr(cacheKey: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  try {
    return await redis.incr(cacheKey);
  } catch {
    return 0;
  }
}

export async function rExpire(cacheKey: string, seconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.expire(cacheKey, seconds);
  } catch {
    /* best effort */
  }
}

/** Fixed-window counter used by every rate limited entry point. */
export async function rateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis();
  if (!redis) return { allowed: true, remaining: limit };

  const count = await rIncr("rl:" + bucket);
  if (count === 1) await rExpire("rl:" + bucket, windowSeconds);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}

export function parseJson<T = unknown>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
