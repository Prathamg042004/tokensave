import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import Ajv from "ajv";
async function loadTs(path) {
  const source = ts.transpileModule(
    fs.readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText;
  return import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );
}
const { recommendPlan, calculateBenefit } = await loadTs("../app/lib/plans.ts");
const { endpoints } = await loadTs("../app/lib/api-docs.ts");
const spec = JSON.parse(
  fs.readFileSync(new URL("../public/openapi.json", import.meta.url), "utf8"),
);
const ajv = new Ajv({ allErrors: true });
function validate(schema, value) {
  const check = ajv.compile({ ...schema, components: spec.components });
  assert.ok(check(value), JSON.stringify(check.errors));
}
test("OpenAPI stays synchronized with the reference source", () => {
  execFileSync(process.execPath, ["scripts/generate-openapi.mjs", "--check"], {
    cwd: new URL("..", import.meta.url),
  });
});
test("each documented method has a real route handler and contract", () => {
  for (const endpoint of endpoints) {
    const route = fs.readFileSync(
      new URL(`../app${endpoint.path}/route.ts`, import.meta.url),
      "utf8",
    );
    assert.match(
      route,
      new RegExp(`export async function ${endpoint.method}\\(`),
    );
    assert.ok(spec.paths[endpoint.path][endpoint.method.toLowerCase()]);
  }
});
test("all request and response examples validate against their OpenAPI schemas", () => {
  for (const operations of Object.values(spec.paths))
    for (const operation of Object.values(operations)) {
      const request = operation.requestBody?.content["application/json"];
      if (request) validate(request.schema, request.example);
      for (const response of Object.values(operation.responses)) {
        const json = response.content?.["application/json"];
        if (!json) continue;
        if (json.example) validate(json.schema, json.example);
        for (const example of Object.values(json.examples ?? {}))
          validate(json.schema, example.value);
      }
    }
});
test("proxy schema rejects empty messages and missing provider credentials", () => {
  const check = ajv.compile({
    ...spec.components.schemas.ProxyRequest,
    components: spec.components,
  });
  assert.equal(check({ messages: [] }), false);
  assert.equal(
    check({
      apiKey: "test-credential",
      messages: [{ role: "user", content: "Hello" }],
    }),
    true,
  );
  assert.equal(
    check({
      apiKey: "test-credential",
      messages: [{ role: "tool", content: "Hello" }],
    }),
    false,
  );
});
test("volume recommendations respect Starter and Growth boundaries", () => {
  for (const [volume, name] of [
    [0, "Starter"],
    [50000, "Starter"],
    [50001, "Growth"],
    [500000, "Growth"],
    [500001, "Enterprise"],
  ])
    assert.equal(recommendPlan(volume).name, name);
  assert.equal(recommendPlan(-1), null);
  assert.equal(recommendPlan(Infinity), null);
});
test("subscription scenarios cover profit, loss and exact break-even", () => {
  assert.equal(calculateBenefit(1000, 20, 99), 101);
  assert.equal(calculateBenefit(1000, 0, 99), -99);
  assert.equal(calculateBenefit(495, 20, 99), 0);
  assert.equal(calculateBenefit(2495, 20, 499), 0);
});

test("context routes produce actual responses matching documented schemas", async () => {
  const { default: Module } = await import("node:module");
  const { fileURLToPath } = await import("node:url");
  const { dirname } = await import("node:path");
  function loadRoute(path) {
    const filename = fileURLToPath(new URL(path, import.meta.url));
    const loadedRoute = new Module(filename);
    loadedRoute.filename = filename;
    loadedRoute.paths = Module._nodeModulePaths(dirname(filename));
    loadedRoute._compile(
      ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
        },
      }).outputText,
      filename,
    );
    return loadedRoute.exports;
  }
  for (const [path, schemaName, body] of [
    [
      "trim-context",
      "TrimResponse",
      {
        messages: [
          { role: "system", content: "Be concise." },
          { role: "user", content: "a".repeat(120) },
          { role: "assistant", content: "b".repeat(120) },
          { role: "user", content: "Hello" },
        ],
        maxTokens: 10,
      },
    ],
    [
      "smart-context",
      "SmartResponse",
      {
        messages: [
          { role: "user", content: "a".repeat(200) },
          { role: "assistant", content: "We agreed to use a queue." },
          { role: "user", content: "Latest question" },
        ],
        maxTokens: 10,
        keepRecent: 1,
      },
    ],
  ]) {
    const route = loadRoute(`../app/api/${path}/route.ts`);
    const result = await route.POST(
      new Request("https://example.test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
    assert.equal(result.status, 200);
    const data = await result.json();
    validate(spec.components.schemas[schemaName], data);
    if (path === "trim-context") {
      assert.equal(data.messages_removed, 2);
      assert.equal(data.trimmed.at(-1).content, "Hello");
    } else {
      assert.equal(data.optimized, true);
      assert.equal(data.messages_kept, 1);
    }
  }
});
