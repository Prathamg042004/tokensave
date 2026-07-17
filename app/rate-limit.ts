import { getRedis } from "./redis";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetIn: number;
}

export async function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) return { allowed: true, remaining: limit, limit, resetIn: 0 };

  const key = "rl:" + identifier;

  try {
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    const ttl = await redis.ttl(key);

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      limit,
      resetIn: ttl > 0 ? ttl : windowSeconds,
    };
  } catch (e) {
    return { allowed: true, remaining: limit, limit, resetIn: 0 };
  }
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetIn),
  };
}