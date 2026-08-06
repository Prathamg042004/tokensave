import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Download-Options", "noopen");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");

  // CORS for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const requestOrigin = request.headers.get("origin") || "";
    // Allowlist of trusted origins. Requests from other origins get no CORS grant.
    const allowedOrigins = [
      "https://tokensave.vercel.app",
      "http://localhost:3000",
    ];
    const origin = allowedOrigins.includes(requestOrigin) ? requestOrigin : "";
    if (origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Vary", "Origin");
    }
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
    response.headers.set("Access-Control-Max-Age", "86400");

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }

    // Request size limit check (500KB)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 500000) {
      return NextResponse.json(
        { error: { message: "Request body too large. Maximum 500KB.", code: 413 } },
        { status: 413 }
      );
    }
  }

  // Block common attack paths
  const path = request.nextUrl.pathname;
  const blockedPaths = [
    "/.env", "/wp-admin", "/wp-login", "/.git",
    "/phpMyAdmin", "/admin", "/config", "/.htaccess",
    "/xmlrpc.php", "/wp-content",
  ];

  if (blockedPaths.some(bp => path.startsWith(bp))) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};
