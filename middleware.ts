import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge middleware: transport and browser-side protections.
 *
 * Changes in this pass:
 *  - a real Content-Security-Policy is sent (the security page claimed one
 *    was already in place; it was not)
 *  - CORS no longer reflects an arbitrary Origin back to the caller
 *  - the unused nonce placeholder is gone
 */

const CSP_DIRECTIVES = [
  "default-src 'self'",
  // Next.js injects its own bootstrap inline; a nonce based policy is the
  // follow-up once every inline script is threaded through the nonce.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://*.supabase.in https://*.upstash.io https://*.ingest.sentry.io https://*.sentry.io",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const BLOCKED_PATHS = [
  "/.env",
  "/.git",
  "/.htaccess",
  "/admin",
  "/config",
  "/phpMyAdmin",
  "/wp-admin",
  "/wp-content",
  "/wp-login",
  "/xmlrpc.php",
];

function allowedOrigins(request: NextRequest): string[] {
  const configured = (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) configured.push(site.replace(/\/+$/, ""));

  configured.push(request.nextUrl.origin);
  return configured;
}

function applySecurityHeaders(headers: Headers) {
  headers.set("Content-Security-Policy", CSP_DIRECTIVES);
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  headers.set("X-DNS-Prefetch-Control", "off");
  headers.set("X-Download-Options", "noopen");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-site");
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (BLOCKED_PATHS.some((blocked) => path.startsWith(blocked))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const response = NextResponse.next();
  applySecurityHeaders(response.headers);

  if (path.startsWith("/api/")) {
    const origin = request.headers.get("origin");

    // Only echo an Origin that this deployment explicitly trusts. Reflecting
    // any Origin turns every browser into a proxy for third party sites.
    if (origin && allowedOrigins(request).includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Vary", "Origin");
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
      response.headers.set("Access-Control-Max-Age", "86400");
    }

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength, 10) > 500000) {
      const tooLarge = NextResponse.json(
        { error: { message: "Request body too large. Maximum 500KB.", code: 413 } },
        { status: 413 }
      );
      applySecurityHeaders(tooLarge.headers);
      return tooLarge;
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
