import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { consumeRateLimit, keyOwner } from "../app/lib/security.mjs";
const run = promisify(execFile);
const enabled = !!(
  process.env.REDIS_TEST_SOCKET || process.env.REDIS_TEST_CONTAINER
);
async function command(...args) {
  const container = process.env.REDIS_TEST_CONTAINER;
  const executable = container
    ? "docker"
    : process.env.REDIS_TEST_CLI || "redis-cli";
  const prefix = container
    ? ["exec", container, "redis-cli", "--json"]
    : ["-s", process.env.REDIS_TEST_SOCKET, "--json"];
  const { stdout } = await run(executable, [...prefix, ...args.map(String)], {
    timeout: 5000,
  });
  return JSON.parse(stdout);
}
const redis = {
  get: (key) => command("GET", key),
  eval: (script, keys, args) =>
    command("EVAL", script, keys.length, ...keys, ...args),
};
const unique = () =>
  `integration:${process.pid}:${Date.now()}:${Math.random()}`;

test(
  "real Redis atomically limits simultaneous requests and repairs missing expiry",
  { skip: !enabled },
  async () => {
    const scope = unique(),
      key = "rl:v2:" + scope;
    try {
      const results = await Promise.all(
        Array.from({ length: 70 }, () =>
          consumeRateLimit(redis, scope, 60, 60),
        ),
      );
      assert.equal(results.filter((r) => r.allowed).length, 60);
      assert.equal(new Set(results.map((r) => r.count)).size, 70);
      assert.ok((await command("TTL", key)) > 0);
      await command("SET", key, "1");
      assert.equal(await command("TTL", key), -1);
      const repaired = await consumeRateLimit(redis, scope);
      assert.equal(repaired.count, 2);
      assert.ok((await command("TTL", key)) > 0);
    } finally {
      await command("DEL", key);
    }
  },
);

test(
  "real Redis key provisioning is atomic and rotation invalidates old keys",
  { skip: !enabled },
  async () => {
    const source = fs.readFileSync(
      new URL("../app/api/generate-key/route.ts", import.meta.url),
      "utf8",
    );
    const script = source.match(/redis\.eval\(\s*`([\s\S]*?)`/)[1];
    const owner = unique(),
      userKey = "user_key:" + owner;
    const keys = Array.from(
      { length: 12 },
      (_, i) => "ts_live_" + (i + 1).toString(16).padStart(64, "0"),
    );
    // Distinct synthetic keys never refer to a real provider or user.
    const rotation = "ts_live_" + "f".repeat(64),
      metadata = JSON.stringify({ userId: owner });
    try {
      const provisioned = await Promise.all(
        keys.map((key) =>
          redis.eval(script, [userKey], ["get", key, metadata]),
        ),
      );
      assert.equal(new Set(provisioned).size, 1);
      const old = provisioned[0];
      assert.equal(await keyOwner(redis, old), owner);
      await redis.eval(script, [userKey], ["rotate", rotation, metadata]);
      await assert.rejects(keyOwner(redis, old), { status: 401 });
      assert.equal(await keyOwner(redis, rotation), owner);
      assert.equal(await command("GET", "key_owner:" + old), null);
    } finally {
      await command(
        "DEL",
        userKey,
        ...keys.map((k) => "key_owner:" + k),
        "key_owner:" + rotation,
      );
    }
  },
);

test(
  "team creation admits only one concurrent creator",
  { skip: !enabled },
  async () => {
    const source = fs.readFileSync(
      new URL("../app/api/teams/route.ts", import.meta.url),
      "utf8",
    );
    const scripts = [...source.matchAll(/redis\.eval\(\s*`([\s\S]*?)`/g)].map(
      (m) => m[1],
    );
    const prefix = unique(),
      userKey = prefix + ":user",
      teamKey = prefix + ":team";
    try {
      const results = await Promise.all(
        Array.from({ length: 20 }, () =>
          command(
            "EVAL",
            scripts[0],
            2,
            userKey,
            teamKey,
            "team1",
            '{"version":1}',
          ),
        ),
      );
      assert.equal(results.filter((r) => r === 1).length, 1);
      assert.equal(await command("GET", userKey), "team1");
    } finally {
      await command("DEL", userKey, teamKey);
    }
  },
);

test(
  "team compare-and-swap rejects stale concurrent edits",
  { skip: !enabled },
  async () => {
    const source = fs.readFileSync(
      new URL("../app/api/teams/route.ts", import.meta.url),
      "utf8",
    );
    const scripts = [...source.matchAll(/redis\.eval\(\s*`([\s\S]*?)`/g)].map(
      (m) => m[1],
    );
    const key = unique(),
      original = '{"version":1}';
    try {
      await command("SET", key, original);
      const results = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          command(
            "EVAL",
            scripts[1],
            1,
            key,
            original,
            JSON.stringify({ version: 2, editor: i }),
          ),
        ),
      );
      assert.equal(results.filter((r) => r === 1).length, 1);
    } finally {
      await command("DEL", key);
    }
  },
);
