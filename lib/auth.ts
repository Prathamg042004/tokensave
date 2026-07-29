import { NextResponse } from "next/server";
import { rGet } from "./redis";
import { hashApiKey, isWellFormedApiKey } from "./keys";

/**
 * Every privileged route resolves the caller through this module.
 *
 * Two accepted credentials:
 *  1. a Supabase access token issued to a signed-in dashboard user
 *  2. a TokenSave API key, matched against its stored SHA-256 digest
 *
 * A "userId" in a request body is never trusted on its own.
 */
export type Identity = {
  userId: string;
  email: string | null;
  via: "session" | "api_key";
};

type StoredKeyOwner = {
  userId?: string;
  email?: string | null;
  revoked?: boolean;
};

function presentedCredential(req: Request): string | null {
  const header = req.headers.get("authorization") || "";
  if (header.toLowerCase().startsWith("bearer ")) {
    const value = header.slice(7).trim();
    if (value) return value;
  }
  const apiKeyHeader = req.headers.get("x-api-key");
  return apiKeyHeader ? apiKeyHeader.trim() : null;
}

async function verifySupabaseSession(accessToken: string): Promise<Identity | null> {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!projectUrl || !anonKey) return null;

  try {
    const res = await fetch(projectUrl.replace(/\/+$/, "") + "/auth/v1/user", {
      headers: { apikey: anonKey, Authorization: "Bearer " + accessToken },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const user = (await res.json()) as { id?: string; email?: string };
    if (!user || typeof user.id !== "string" || user.id.length === 0) return null;

    return { userId: user.id, email: user.email ?? null, via: "session" };
  } catch {
    return null;
  }
}

export async function verifyApiKey(presented: string): Promise<Identity | null> {
  if (!isWellFormedApiKey(presented)) return null;

  const digest = await hashApiKey(presented);
  const stored = await rGet<StoredKeyOwner | string>("key_owner_hash:" + digest);
  if (!stored) return null;

  let owner: StoredKeyOwner | null = null;
  if (typeof stored === "string") {
    try {
      owner = JSON.parse(stored) as StoredKeyOwner;
    } catch {
      owner = null;
    }
  } else {
    owner = stored;
  }

  if (!owner || typeof owner.userId !== "string" || owner.revoked) return null;
  return { userId: owner.userId, email: owner.email ?? null, via: "api_key" };
}

/** Resolves the caller, or null when the request is anonymous or invalid. */
export async function authenticate(req: Request): Promise<Identity | null> {
  const credential = presentedCredential(req);
  if (!credential) return null;

  if (credential.startsWith("ts_live_")) return verifyApiKey(credential);
  return verifySupabaseSession(credential);
}

export function unauthorized(message = "Authentication required") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "You do not have access to this resource") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Never surface exception text to a caller: it has leaked Redis URLs and
 * upstream provider errors in the past. Log it, return a stable message.
 */
export function serverError(context: string, error: unknown) {
  console.error("[tokensave] " + context, error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
