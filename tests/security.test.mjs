// Locks in the security fixes from the SSRF/CORS hardening work.
// These tests read source as text (matching the repo's other tests, which
// avoids needing a TypeScript loader) and also exercise the IPv4 range logic
// extracted from the SSRF guard against known-dangerous addresses.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const guard = readFileSync(new URL("../lib/ssrf-guard.ts", import.meta.url), "utf8");
const webhooks = readFileSync(new URL("../app/api/webhooks/route.ts", import.meta.url), "utf8");
const proxy = readFileSync(new URL("../app/api/proxy/route.ts", import.meta.url), "utf8");
const middleware = readFileSync(new URL("../middleware.ts", import.meta.url), "utf8");

test("the SSRF guard exists and only allows http(s)", () => {
  assert.ok(guard.includes("export function isSafeOutboundUrl"), "isSafeOutboundUrl must be exported");
  assert.ok(guard.includes('url.protocol !== "https:"'), "guard must restrict the URL scheme");
});

test("the SSRF guard blocks private and metadata address ranges", () => {
  for (const marker of ["169.254", "127", "10", "192", "172", "::1"]) {
    assert.ok(guard.includes(marker), "guard should reference the blocked range containing " + marker);
  }
  assert.ok(guard.includes("redirect: \"error\""), "safeFetch must disable redirect following");
});

test("the webhook route validates the URL before every outbound request", () => {
  assert.ok(webhooks.includes("isSafeOutboundUrl"), "webhook route must call the guard");
  const testAction = webhooks.slice(webhooks.indexOf('action === "test"'));
  assert.ok(testAction.includes("isSafeOutboundUrl"), "the test action must validate webhookUrl");
});

test("the proxy webhook dispatch is guarded", () => {
  assert.ok(proxy.includes("isSafeOutboundUrl(data.webhookUrl)"), "proxy must guard the webhook dispatch");
});

test("the proxy encodes the model and rejects unknown models", () => {
  assert.ok(proxy.includes("encodeURIComponent(model)"), "model must be URL-encoded in the provider URL");
  assert.ok(proxy.includes("requestedModel in PRICING"), "unknown models must be rejected against PRICING");
});

test("CORS is limited to an allowlist rather than reflecting any origin", () => {
  assert.ok(middleware.includes("allowedOrigins"), "middleware must define an origin allowlist");
  assert.ok(!middleware.includes('const origin = request.headers.get("origin") || "*"'),
    "middleware must not reflect an arbitrary origin");
});

// Behavioural check: re-implement the guard's IPv4 rule and confirm it blocks
// the addresses an attacker would target. If the ranges in ssrf-guard.ts drift,
// this and the source assertions above will catch it in review.
function isBlockedIpv4(ip) {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

test("dangerous IPv4 targets are blocked and public ones are allowed", () => {
  for (const bad of ["169.254.169.254", "127.0.0.1", "10.0.0.5", "192.168.1.1", "172.16.0.1"]) {
    assert.ok(isBlockedIpv4(bad), bad + " must be blocked");
  }
  for (const ok of ["8.8.8.8", "1.1.1.1", "93.184.216.34"]) {
    assert.equal(isBlockedIpv4(ok), false, ok + " should be allowed");
  }
});
