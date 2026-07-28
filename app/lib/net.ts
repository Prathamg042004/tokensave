// Outbound request screening.
//
// Anything the platform fetches on behalf of a caller (webhook deliveries and
// webhook tests today) has to be checked first, otherwise the deployment can be
// pointed at loopback, private or link-local addresses and used to read cloud
// metadata. Both the webhooks route and the proxy share this screen so the two
// can never drift apart.

const MAX_URL_LENGTH = 2048;

const BLOCKED_HOSTS = new Set([
    "localhost",
    "0.0.0.0",
    "metadata.google.internal",
  ]);

const BLOCKED_SUFFIXES = [".local", ".internal", ".localhost"];

/**
 * Return the URL when it is a public https endpoint, or null when it is not.
 *
 * This blocks literal addresses only. A hostname that resolves to a private
 * address still gets through, so callers should also keep timeouts short and
 * never forward the response body back to the caller.
 */
export function safeWebhookUrl(value: unknown): URL | null {
    if (typeof value !== "string" || value.length > MAX_URL_LENGTH) return null;

  let url: URL;
    try {
          url = new URL(value);
    } catch {
          return null;
    }

  if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;

  const host = url.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(host)) return null;
    if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return null;
    // Any IPv6 literal, which covers ::1 and the unique-local range.
  if (host.includes(":")) return null;

  const octets = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (octets) {
          const first = Number(octets[1]);
          const second = Number(octets[2]);
          if (first === 0 || first === 10 || first === 127) return null;
          if (first === 169 && second === 254) return null;
          if (first === 192 && second === 168) return null;
          if (first === 172 && second >= 16 && second <= 31) return null;
          if (first >= 224) return null;
    }

  return url;
}
