import { Redis } from "@upstash/redis";

let redisInstance: Redis | null = null;

export function getRedis(): Redis | null {
  if (redisInstance) return redisInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("Redis not configured: missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
    return null;
  }

  try {
    redisInstance = new Redis({ url, token });
    return redisInstance;
  } catch (e) {
    console.error("Redis connection failed:", e);
    return null;
  }
}

export async function safeGet(key: string): Promise<any> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch (e) {
    console.error("Redis GET failed:", key, e);
    return null;
  }
}

export async function safeSet(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, typeof value === "string" ? value : JSON.stringify(value));
    } else {
      await redis.set(key, typeof value === "string" ? value : JSON.stringify(value));
    }
    return true;
  } catch (e) {
    console.error("Redis SET failed:", key, e);
    return false;
  }
}

export async function safeDel(key: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.del(key);
    return true;
  } catch (e) {
    console.error("Redis DEL failed:", key, e);
    return false;
  }
}

export async function safeIncr(key: string, field: string, amount: number = 1): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.hincrby(key, field, amount);
    return true;
  } catch (e) {
    console.error("Redis HINCRBY failed:", key, field, e);
    return false;
  }
}

export async function safeListPush(key: string, value: any, maxLength: number = 500): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.lpush(key, typeof value === "string" ? value : JSON.stringify(value));
    await redis.ltrim(key, 0, maxLength - 1);
    return true;
  } catch (e) {
    console.error("Redis LPUSH failed:", key, e);
    return false;
  }
}

export async function safeListGet(key: string, start: number = 0, end: number = 49): Promise<any[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    return await redis.lrange(key, start, end) || [];
  } catch (e) {
    console.error("Redis LRANGE failed:", key, e);
    return [];
  }
}

export async function safeHashGetAll(key: string): Promise<Record<string, any>> {
  const redis = getRedis();
  if (!redis) return {};
  try {
    return await redis.hgetall(key) || {};
  } catch (e) {
    console.error("Redis HGETALL failed:", key, e);
    return {};
  }
}