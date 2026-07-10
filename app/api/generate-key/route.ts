import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

let redis: any = null;
try {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  });
} catch (e) {}

function generateKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "ts_live_";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, action } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!redis) {
      return NextResponse.json({ error: "Storage unavailable" }, { status: 500 });
    }

    if (action === "rotate") {
      const oldKey = await redis.get("user_key:" + userId);
      if (oldKey) {
        await redis.del("key_owner:" + oldKey);
      }
      const newKey = generateKey();
      await redis.set("user_key:" + userId, newKey);
      await redis.set("key_owner:" + newKey, JSON.stringify({ userId, email, created: Date.now(), rotated: true }));
      return NextResponse.json({ key: newKey, rotated: true });
    }

    const existing = await redis.get("user_key:" + userId);
    if (existing) {
      return NextResponse.json({ key: existing });
    }

    const key = generateKey();
    await redis.set("user_key:" + userId, key);
    await redis.set("key_owner:" + key, JSON.stringify({ userId, email, created: Date.now() }));

    return NextResponse.json({ key });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}