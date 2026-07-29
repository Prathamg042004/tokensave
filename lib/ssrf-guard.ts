import { NextResponse } from "next/server";

/**
 * SSRF guard for user-supplied outbound URLs (e.g. webhook targets).
 *
 * Blocks requests to private, loopback, link-local and cloud-metadata
 * address ranges, and restricts the scheme to http(s). This mitigates
 * Server-Side Request Forgery (CWE-918) where an attacker controls the
 * destination of a fetch() the server performs.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
]);

// IPv4 ranges that must never be reachable from a user-supplied URL.
function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function isBlockedIpv6(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "::1" || h === "::") return true; // loopback / unspecified
  if (h.startsWith("fe80")) return true; // link-local
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // unique local
  if (h.startsWith("::ffff:")) return true; // IPv4-mapped
  return false;
}

export function isSafeOutboundUrl(rawUrl: unknown): boolean {
  if (typeof rawUrl !== "string" || rawUrl.length === 0 || rawUrl.length > 2048) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return false;

  // Credentials in the URL are a common SSRF/exfiltration vector.
  if (url.username || url.password) return false;

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (BLOCKED_HOSTNAMES.has(host)) return false;
  if (host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return false;

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    if (isBlockedIpv4(host)) return false;
  }

  if (host.includes(":") && isBlockedIpv6(host)) return false;

  return true;
}

/**
 * Perform a fetch only if the destination URL passes the SSRF guard.
 * Returns null when the URL is rejected so callers can skip silently.
 */
export async function safeFetch(
  rawUrl: unknown,
  init: RequestInit,
): Promise<Response | null> {
  if (!isSafeOutboundUrl(rawUrl)) return null;
  return fetch(rawUrl as string, { ...init, redirect: "error" });
}

export function rejectUnsafeUrl(): NextResponse {
  return NextResponse.json(
    { error: "webhookUrl points to a disallowed or private address" },
    { status: 400 },
  );
}
import { NextResponse } from "next/server";

/**
 * SSRF guard for user-supplied outbound URLs (e.g. webhook targets).
 *
 * Blocks requests to private, loopback, link-local and cloud-metadata
 * address ranges, and restricts the scheme to http(s). This mitigates
 * Server-Side Request Forgery (CWE-918) where an attacker controls the
 * destination of a fetch() the server performs.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
]);

// IPv4 ranges that must never be reachable from a user-supplied URL.
function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function isBlockedIpv6(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "::1" || h === "::") return true; // loopback / unspecified
  if (h.startsWith("fe80")) return true; // link-local
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // unique local
  if (h.startsWith("::ffff:")) return true; // IPv4-mapped
  return false;
}

export function isSafeOutboundUrl(rawUrl: unknown): boolean {
  if (typeof rawUrl !== "string" || rawUrl.length === 0 || rawUrl.length > 2048) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return false;

  // Credentials in the URL are a common SSRF/exfiltration vector.
  if (url.username || url.password) return false;

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (BLOCKED_HOSTNAMES.has(host)) return false;
  if (host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return false;

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    if (isBlockedIpv4(host)) return false;
  }

  if (host.includes(":") && isBlockedIpv6(host)) return false;

  return true;
}

/**
 * Perform a fetch only if the destination URL passes the SSRF guard.
 * Returns null when the URL is rejected so callers can skip silently.
 */
export async function safeFetch(
  rawUrl: unknown,
  init: RequestInit,
): Promise<Response | null> {
  if (!isSafeOutboundUrl(rawUrl)) return null;
  return fetch(rawUrl as string, { ...init, redirect: "error" });
}

export function rejectUnsafeUrl(): NextResponse {
  return NextResponse.json(
    { error: "webhookUrl points to a disallowed or private address" },
    { status: 400 },
  );
}
