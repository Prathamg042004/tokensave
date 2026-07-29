/**
 * Outbound request guard.
 *
 * CodeQL flagged three critical server-side request forgery paths where a
 * caller-supplied URL was fetched by the server. Every outbound call to a
 * caller-influenced destination now goes through this module.
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "instance-data",
  "169.254.169.254",
]);

const BLOCKED_SUFFIXES = [".local", ".internal", ".localhost", ".home.arpa"];

export type UrlVerdict = { ok: true; url: URL } | { ok: false; reason: string };

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) return false;

  const octets = parts.map((part) => Number(part));
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;

  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "::" || h === "::1") return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true;
  if (h.startsWith("fe80")) return true;
  if (h.startsWith("::ffff:")) return true;
  return false;
}

/**
 * Accepts only public https endpoints. An optional WEBHOOK_HOST_ALLOWLIST
 * turns this into a strict allowlist for deployments that want one.
 */
export function validateOutboundUrl(candidate: unknown): UrlVerdict {
  if (typeof candidate !== "string" || candidate.length === 0) {
    return { ok: false, reason: "URL must be a non-empty string" };
  }
  if (candidate.length > 2048) {
    return { ok: false, reason: "URL exceeds 2048 characters" };
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, reason: "URL is malformed" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, reason: "Only https URLs are accepted" };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "Credentials in the URL are not accepted" };
  }
  if (url.port && url.port !== "443") {
    return { ok: false, reason: "Only port 443 is accepted" };
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || BLOCKED_HOSTS.has(host)) {
    return { ok: false, reason: "Host is not publicly routable" };
  }
  if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return { ok: false, reason: "Host is not publicly routable" };
  }
  if (!host.includes(".") && !host.includes(":")) {
    return { ok: false, reason: "Host is not a fully qualified domain name" };
  }
  if (host.includes(":") && isPrivateIpv6(host)) {
    return { ok: false, reason: "Host is in a reserved address range" };
  }
  if (/^[0-9.]+$/.test(host) && isPrivateIpv4(host)) {
    return { ok: false, reason: "Host is in a reserved address range" };
  }

  const allowlist = (process.env.WEBHOOK_HOST_ALLOWLIST || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length > 0 && !allowlist.includes(host)) {
    return { ok: false, reason: "Host is not on the configured webhook allowlist" };
  }

  return { ok: true, url };
}

/**
 * Delivers a webhook payload. Redirects are not followed, the request is
 * time-boxed, and delivery failures never propagate to the caller.
 */
export async function deliverWebhook(
  candidate: unknown,
  payload: unknown,
  timeoutMs = 3000
): Promise<{ delivered: boolean; status?: number; reason?: string }> {
  const verdict = validateOutboundUrl(candidate);
  if (!verdict.ok) return { delivered: false, reason: verdict.reason };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(verdict.url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TokenSave-Webhook/1.0",
      },
      body: JSON.stringify(payload),
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
    });
    return { delivered: res.status >= 200 && res.status < 300, status: res.status };
  } catch {
    return { delivered: false, reason: "Delivery failed" };
  } finally {
    clearTimeout(timer);
  }
}
