import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import {
  requireUser,
  assertOwner,
  accessResponse,
  readJson,
  AccessError,
} from "../../lib/security.mjs";
import { text, record } from "../../lib/validation.mjs";
import type { Team } from "../../types";
let redis: Redis | null = null;
try {
  const url = process.env.UPSTASH_REDIS_REST_URL,
    token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) redis = new Redis({ url, token });
} catch {}
function parseTeam(raw: unknown): Team {
  let value: unknown;
  try {
    value = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    throw new AccessError(503, "Team data unavailable.");
  }
  if (
    !record(value) ||
    typeof value.id !== "string" ||
    typeof value.owner !== "string" ||
    typeof value.name !== "string" ||
    typeof value.created !== "number" ||
    !Array.isArray(value.members) ||
    value.members.some(
      (m) =>
        !record(m) ||
        typeof m.email !== "string" ||
        typeof m.role !== "string" ||
        typeof m.joined !== "number",
    )
  )
    throw new AccessError(503, "Team data unavailable.");
  return structuredClone(value) as unknown as Team;
}
export async function POST(req: Request) {
  try {
    const user = await requireUser(req),
      body = await readJson(req);
    assertOwner(body.userId, user.id);
    const action = text(body.action, "action", 20);
    if (!["create", "invite", "remove", "get"].includes(action))
      throw new AccessError(400, "Invalid action.");
    if (!redis) throw new AccessError(503, "Storage unavailable.");
    const role = body.role ?? "member";
    if (role !== "member" && role !== "admin" && role !== "viewer")
      throw new AccessError(400, "Invalid role.");
    if (action === "create") {
      const team: Team = {
        id: "team_" + crypto.randomUUID(),
        name: text(body.teamName, "teamName", 100),
        owner: user.id,
        members: [
          {
            userId: user.id,
            email: user.email,
            role: "owner",
            joined: Date.now(),
          },
        ],
        created: Date.now(),
      };
      const created = await redis.eval(
        `
        if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
        redis.call('SET', KEYS[1], ARGV[1])
        redis.call('SET', KEYS[2], ARGV[2])
        return 1
      `,
        ["user_team:" + user.id, "team:" + team.id],
        [team.id, JSON.stringify(team)],
      );
      if (created !== 1)
        throw new AccessError(409, "An account team already exists.");
      return NextResponse.json(
        { team },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const teamId = await redis.get<string>("user_team:" + user.id);
    if (!teamId) {
      if (action === "get")
        return NextResponse.json(
          { team: null },
          { headers: { "Cache-Control": "no-store" } },
        );
      throw new AccessError(404, "No team found.");
    }
    const raw = await redis.get("team:" + teamId);
    if (!raw) throw new AccessError(404, "Team not found.");
    const team = parseTeam(raw);
    if (team.owner !== user.id)
      throw new AccessError(
        403,
        "Only the team owner can access this management endpoint.",
      );
    if (action === "get")
      return NextResponse.json(
        { team },
        { headers: { "Cache-Control": "no-store" } },
      );
    const email = text(body.memberEmail, "memberEmail", 254)
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new AccessError(400, "Invalid memberEmail.");
    if (action === "invite") {
      if (team.members.length >= 100)
        throw new AccessError(409, "Team member limit reached.");
      if (team.members.some((m) => m.email.toLowerCase() === email))
        throw new AccessError(409, "Member already exists.");
      team.members.push({ email, role, joined: Date.now(), status: "invited" });
    } else {
      if (
        team.members.some(
          (m) => m.role === "owner" && m.email.toLowerCase() === email,
        )
      )
        throw new AccessError(400, "The owner cannot be removed.");
      team.members = team.members.filter(
        (m) => m.email.toLowerCase() !== email,
      );
    }
    const expected = typeof raw === "string" ? raw : JSON.stringify(raw);
    const updated = await redis.eval(
      `
      if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
      redis.call('SET', KEYS[1], ARGV[2])
      return 1
    `,
      ["team:" + teamId],
      [expected, JSON.stringify(team)],
    );
    if (updated !== 1)
      throw new AccessError(409, "Team changed. Reload and retry.");
    return NextResponse.json(
      { team },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return accessResponse(error);
  }
}
export async function GET() {
  return NextResponse.json({
    service: "TokenSave Teams",
    description:
      "Owner-scoped team records and pending invitations. Pending records do not send email or grant access.",
    actions: ["create", "get", "invite", "remove"],
  });
}
