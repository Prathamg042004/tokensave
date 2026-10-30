import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
class NextResponse extends Response {
  static next() {
    return new NextResponse(null);
  }
  static json(value, init) {
    return new NextResponse(JSON.stringify(value), init);
  }
}
const routeModule = { exports: {} };
const source = ts.transpileModule(
  fs.readFileSync(new URL("../middleware.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
new Function("require", "exports", "module", source)(
  () => ({ NextResponse }),
  routeModule.exports,
  routeModule,
);
const { middleware } = routeModule.exports;
const request = (path, method = "GET", headers = {}) => ({
  nextUrl: new URL("https://tokensave.in" + path),
  method,
  headers: new Headers(headers),
});
test("API preflight is public BYOK CORS without cookie credentials or reflected origins", () => {
  const response = middleware(
    request("/api/proxy", "OPTIONS", { origin: "https://untrusted.test" }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(response.headers.get("access-control-allow-credentials"), null);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});
test("early rejection responses retain security and cache headers", () => {
  for (const req of [
    request("/api/proxy", "POST", { "content-length": "500001" }),
    request("/.env"),
  ]) {
    const response = middleware(req);
    assert.ok([413, 404].includes(response.status));
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.ok(
      response.headers
        .get("content-security-policy")
        .includes("object-src 'none'"),
    );
  }
});
