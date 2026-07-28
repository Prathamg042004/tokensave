// Shared security primitives for the TokenSave API routes.
//
// Everything exported from here is pure: no Redis, no Next.js, no environment
// access. That keeps the rules in one place instead of copy-pasted across route
// handlers, and it means they can be unit tested with the built-in node:test
// runner (see tests/security.test.mjs) without a build step.

/** Prefix carried by every TokenSave API key. */
export const KEY_PREFIX = "ts_live_";

/** Version tag baked into cache keys so the shape can change safely. */
export const CACHE_KEY_VERSION = 2;

/** 24 random bytes -> 48 hex characters -> 192 bits of entropy. */
const KEY_BYTES = 24;

// Keys minted before this module existed were 32 characters of [a-z0-9], so the
// shape check stays deliberately wide. It is a cheap sanity filter, never proof
// that a key is real - only a lookup in Redis can decide that.
const KEY_SHAPE = /^ts_live_[a-z0-9]{24,80}$/;

const BEARER = /^Bearer[ ]+(.+)$/i;

const IPV4 = /^([0-9]{1,3})[.]([0-9]{1,3})[.]([0-9]{1,3})[.]([0-9]{1,3})$/;

// Hostnames that must never be reachable from a user-supplied webhook URL.
const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
]);

const BLOCKED_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".home.arpa",
];

function toHex(buffer) {
  let hex = "";
  for (const byte of new Uint8Array(buffer)) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

/**
 * Mint a new API key using the platform CSPRNG.
 * Math.random() is not a CSPRNG and must never be used for credentials.
 */
export function generateApiKey() {
  const bytes = new Uint8Array(KEY_BYTES);
  crypto.getRandomValues(bytes);
  return KEY_PREFIX + toHex(bytes);
}

/** Cheap shape check. Does not prove the key exists. */
export function isWellFormedApiKey(value) {
  return typeof value === "string" && KEY_SHAPE.test(value);
}

/** Pull the token out of an "Authorization: Bearer <token>" header value. */
export function extractBearerToken(headerValue) {
  if (typeof headerValue !== "string") return null;
  const match = headerValue.match(BEARER);
  return match ? match[1].trim() : null;
}

/** SHA-256 of a string, lowercase hex. */
export async function sha256Hex(input) {
  const data = new TextEncoder().encode(String(input));
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

/**
 * Stable, non-reversible identifier for a key. Used as a Redis index and as the
 * cache namespace so a raw key never becomes a lookup table entry.
 */
export async function hashApiKey(key) {
  return sha256Hex(String(key));
}

/** HMAC-SHA256 of a message, lowercase hex. Used to sign webhook deliveries. */
export async function hmacSha256Hex(secret, message) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(String(message)));
  return toHex(signature);
}

/**
 * Length-independent comparison. Avoids leaking how much of a secret matched
 * through response timing.
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** Reduce a messages array to the fields that affect the model response. */
export function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.map((message) => ({
    role: String((message && message.role) || ""),
    content: String((message && message.content) || ""),
  }));
}

/**
 * Build a cache key that cannot collide across tenants, providers or models.
 *
 * The previous implementation hashed the message text alone with a 32-bit
 * rolling hash, so two different customers asking the same question shared one
 * cache entry, and two different questions could collide outright. SHA-256 over
 * a canonical envelope fixes both, and "scope" keeps every caller in their own
 * namespace.
 */
export async function buildCacheKey(options) {
  const opts = options || {};
  const canonical = JSON.stringify({
    v: CACHE_KEY_VERSION,
    scope: String(opts.scope || "anonymous"),
    provider: String(opts.provider || ""),
    model: String(opts.model || ""),
    messages: normalizeMessages(opts.messages),
  });
  return "cache:v" + CACHE_KEY_VERSION + ":" + (await sha256Hex(canonical));
}

/**
 * True when a hostname points somewhere that must not be reachable from our
 * servers: loopback, link-local, cloud metadata, RFC1918, CGNAT, benchmarking
 * ranges, and anything that is not global-unicast IPv6.
 */
export function isPrivateHostname(hostname) {
  const host = String(hostname || "").toLowerCase().replace("[", "").replace("]", "");
  if (!host) return true;
  if (BLOCKED_HOSTS.has(host)) return true;
  if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;

  const v4 = host.match(IPV4);
  if (v4) {
    const octets = [Number(v4[1]), Number(v4[2]), Number(v4[3]), Number(v4[4])];
    if (octets.some((octet) => Number.isNaN(octet) || octet > 255)) return true;
    const a = octets[0];
    const b = octets[1];
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a >= 224) return true;
    return false;
  }

  if (host.includes(":")) {
    if (host === "::" || host === "::1") return true;
    if (host.startsWith("::ffff:")) return true;
    if (host.startsWith("fc") || host.startsWith("fd")) return true;
    if (host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb")) return true;
    return !(host.startsWith("2") || host.startsWith("3"));
  }

  return false;
}

/**
 * Validate a user-supplied webhook URL before making a request to it. Throws
 * with a message that is safe to hand back to the caller.
 *
 * Caveat worth stating plainly: this blocks literal private targets, not a
 * public hostname that resolves to a private address. Closing that gap needs DNS
 * resolution plus address pinning, which the Edge runtime cannot do. The
 * "redirect: error" below covers the redirect half of the same trick.
 */
export function assertSafeWebhookUrl(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl));
  } catch {
    throw new Error("webhookUrl is not a valid URL");
  }
  if (url.protocol !== "https:") throw new Error("webhookUrl must use https");
  if (url.username || url.password) throw new Error("webhookUrl must not embed credentials");
  if (url.port && url.port !== "443") throw new Error("webhookUrl must use the default https port");
  if (isPrivateHostname(url.hostname)) throw new Error("webhookUrl must point at a public address");
  return url;
}

/** Convenience wrapper: returns a boolean instead of throwing. */
export function isSafeWebhookUrl(rawUrl) {
  try {
    assertSafeWebhookUrl(rawUrl);
    return true;
  } catch {
    return false;
  }
}

/**
 * POST JSON to a validated webhook URL with a timeout, no redirect following,
 * and an optional HMAC signature so receivers can verify the payload came from
 * us and is fresh.
 */
export async function safePostJson(rawUrl, payload, options = {}) {
  const url = assertSafeWebhookUrl(rawUrl);
  const body = JSON.stringify(payload);
  const timestamp = String(options.timestamp || Date.now());
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "TokenSave-Webhook/1",
    "X-TokenSave-Timestamp": timestamp,
  };
  if (options.secret) {
    headers["X-TokenSave-Signature"] = "sha256=" + (await hmacSha256Hex(options.secret, timestamp + "." + body));
  }
  return fetch(url, {
    method: "POST",
    redirect: "error",
    headers,
    body,
    signal: AbortSignal.timeout(options.timeoutMs || 5000),
  });
}

/**
 * Resolve the Access-Control-Allow-Origin value for a request.
 *
 * Reflecting whatever Origin header arrives - the previous behaviour - makes
 * every site on the internet a trusted caller. Browsers only honour credentialed
 * cross-origin reads for an explicit origin, so anything off the allowlist gets
 * the site's own origin instead.
 */
export function resolveAllowedOrigin(requestOrigin, allowList) {
  const allowed = Array.isArray(allowList) ? allowList.filter(Boolean) : [];
  const origin = typeof requestOrigin === "string" ? requestOrigin.trim() : "";
  if (origin && allowed.includes(origin)) return origin;
  return allowed[0] || "null";
}
