import {
  requireUser,
  assertOwner,
  accessResponse,
  readJson,
} from "../../lib/security.mjs";
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;
try {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  });
} catch {}

function generateKey(): string {
  return "ts_live_" + randomBytes(32).toString("hex");
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    assertOwner(body.userId, user.id);
    body.userId = user.id;
    body.email = user.email;
    const { id: userId, email } = user;
    const action = body.action;
    if (action !== undefined && action !== "get" && action !== "rotate")
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    if (!redis) {
      return NextResponse.json(
        { error: "Storage unavailable" },
        { status: 503 },
      );
    }

    const newKey = generateKey();
    const metadata = JSON.stringify({ userId, email, created: Date.now() });
    const key = await redis.eval(
      `
      local old = redis.call('GET', KEYS[1])
      if old and ARGV[1] ~= 'rotate' then return old end
      if old then redis.call('DEL', 'key_owner:' .. old) end
      redis.call('SET', KEYS[1], ARGV[2])
      redis.call('SET', 'key_owner:' .. ARGV[2], ARGV[3])
      return ARGV[2]
    `,
      ["user_key:" + userId],
      [action || "get", newKey, metadata],
    );
    if (typeof key !== "string")
      return NextResponse.json(
        { error: "Storage unavailable" },
        { status: 503 },
      );
    return NextResponse.json(
      { key, rotated: action === "rotate" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return accessResponse(error);
  }
}
