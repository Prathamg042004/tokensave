import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import * as security from "../../app/lib/security.mjs";
export function loadRoute(name, redis) {
  const url = new URL("../../app/api/" + name + "/route.ts", import.meta.url);
  const routeModule = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(url, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const req = (id) =>
    id === "next/server"
      ? { NextRequest: Request, NextResponse: Response }
      : id === "@upstash/redis"
        ? {
            Redis: class {
              constructor() {
                return redis;
              }
            },
          }
        : id.endsWith("security.mjs")
          ? security
          : id === "../proxy/route"
            ? loadRoute("proxy", redis)
            : createRequire(url)(id);
  new Function("require", "exports", "module", source)(
    req,
    routeModule.exports,
    routeModule,
  );
  return routeModule.exports;
}
export function storage() {
  const values = new Map(),
    calls = [];
  return {
    values,
    calls,
    get: async (key) => {
      calls.push(key);
      return values.get(key) ?? null;
    },
    setex: async (key, _ttl, value) => values.set(key, value),
    eval: async () => [1, 60],
    hincrby: async () => {},
    lpush: async () => {},
    ltrim: async () => {},
    lrange: async () => [],
    hgetall: async () => ({}),
  };
}
export const request = (body) =>
  new Request("https://example.test/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
