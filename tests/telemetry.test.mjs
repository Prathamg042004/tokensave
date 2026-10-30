import test from "node:test";
import assert from "node:assert/strict";
import { redactEvent } from "../app/lib/telemetry.mjs";
test("monitoring redacts request bodies, headers, cookies, query/fragment, breadcrumbs and extras", () => {
  const event = {
    message: "safe failure",
    request: {
      url: "https://tokensave.in/api/proxy?apiKey=private-secret#access_token=private-secret",
      method: "POST",
      headers: { Authorization: "private-secret" },
      cookies: "private-secret",
      data: { apiKey: "private-secret" },
    },
    breadcrumbs: [{ data: { body: "private-secret" } }],
    extra: { apiKey: "private-secret" },
    exception: { values: [{ type: "Error", value: "safe failure" }] },
  };
  const redacted = redactEvent(event);
  assert.equal(JSON.stringify(redacted).includes("private-secret"), false);
  assert.deepEqual(redacted.request, {
    url: "https://tokensave.in/api/proxy",
    method: "POST",
  });
  assert.equal(redacted.exception.values[0].value, "safe failure");
  assert.deepEqual(redactEvent({ message: "safe" }), { message: "safe" });
});

test("browser, server and edge monitoring all install redaction hooks without sending telemetry", async () => {
  const { readFileSync } = await import("node:fs");
  const { default: ts } = await import("typescript");
  for (const file of [
    "sentry.client.config.ts",
    "sentry.server.config.ts",
    "sentry.edge.config.ts",
  ]) {
    let config;
    const source = ts.transpileModule(
      readFileSync(new URL("../" + file, import.meta.url), "utf8"),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText;
    new Function("require", "exports", source)(
      (id) =>
        id === "@sentry/nextjs"
          ? {
              init: (value) => {
                config = value;
              },
            }
          : { redactEvent },
      {},
    );
    assert.equal(config.sendDefaultPii, false);
    for (const hook of [config.beforeSend, config.beforeSendTransaction]) {
      const event = hook({
        request: {
          url: "https://example.test/api?key=private-secret",
          data: { apiKey: "private-secret" },
        },
      });
      assert.equal(JSON.stringify(event).includes("private-secret"), false);
    }
    if (file === "sentry.client.config.ts")
      assert.equal(config.replaysOnErrorSampleRate, 0);
  }
});
