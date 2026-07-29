import { sha256Hex } from "./keys";

/**
 * Cache addressing.
 *
 * The previous scheme hashed only the message text with a 32-bit
 * ((h << 5) - h) loop and used the result as a global key. Two problems:
 *
 *  1. no tenant in the key, so any caller could be served another caller's
 *     cached completion for the same prompt;
 *  2. 32 bits collide in practice (roughly a coin flip after ~65k entries),
 *     and a collision returns an unrelated response.
 *
 * Keys are now SHA-256 over a canonical descriptor that includes the tenant,
 * the provider, the routed model and the quality mode.
 */

export const CACHE_NAMESPACE = "cache:v2";

export type CacheMessage = { role: string; content: string };

export type CacheDescriptor = {
  tenant: string;
  provider: string;
  model: string;
  quality: string;
  messages: CacheMessage[];
};

export async function buildCacheKey(descriptor: CacheDescriptor): Promise<string> {
  const canonical = JSON.stringify({
    provider: descriptor.provider,
    model: descriptor.model,
    quality: descriptor.quality,
    messages: descriptor.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  });

  const digest = await sha256Hex(canonical);
  const tenant = await sha256Hex(descriptor.tenant);
  return CACHE_NAMESPACE + ":" + tenant.slice(0, 16) + ":" + digest;
}

/**
 * Anonymous callers share a single namespace, so they can only ever hit
 * entries created by other anonymous callers on the same deployment. Signed
 * requests are isolated per account.
 */
export function tenantOf(identity: { userId: string } | null): string {
  return identity ? "user:" + identity.userId : "anonymous";
}
