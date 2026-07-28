import { NextRequest, NextResponse } from "next/server";

import { getRedis, requireSupabaseUser } from "@/app/lib/auth";

// Team management for the dashboard.
//
// Every action used to take the acting userId straight from the request body,
// so anyone could create a team as another account, invite themselves into a
// team or remove its members. The caller is now identified by a verified
// Supabase session and ownership is re-checked against that identity.

const ROLES = ["admin", "member", "viewer"] as const;
type Role = (typeof ROLES)[number];

type Member = {
    userId?: string;
    email: string;
    role: Role | "owner";
    joined: number;
    status?: string;
};

type Team = {
    id: string;
    name: string;
    owner: string;
    members: Member[];
    created: number;
};

const MAX_TEAM_NAME = 60;
const MAX_MEMBERS = 50;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseTeam(raw: unknown): Team | null {
    try {
          const value = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (value && typeof value.id === "string" && Array.isArray(value.members)) {
                  return value as Team;
          }
          return null;
    } catch {
          return null;
    }
}

function cleanName(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_TEAM_NAME) return null;
    return trimmed;
}

function cleanEmail(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim().toLowerCase();
    return trimmed.length <= 254 && EMAIL_PATTERN.test(trimmed) ? trimmed : null;
}

function cleanRole(value: unknown): Role {
    // Roles come from a fixed list so a caller cannot invent "owner".
  return ROLES.includes(value as Role) ? (value as Role) : "member";
}

export async function POST(req: NextRequest) {
    const session = await requireSupabaseUser(req);
    if (!session.ok) {
          return NextResponse.json({ error: session.error }, { status: session.status });
    }

  const redis = getRedis();
    if (!redis) {
          return NextResponse.json({ error: "Team storage is unavailable" }, { status: 503 });
    }

  const userId = session.auth.id;
    const email = session.auth.email || "";

  let body: Record<string, unknown>;
    try {
          body = (await req.json()) as Record<string, unknown>;
    } catch {
          return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
    }

  const action = typeof body.action === "string" ? body.action : "";

  try {
        if (action === "create") {
                const name = cleanName(body.teamName);
                if (!name) {
                          return NextResponse.json({ error: "teamName must be 1-60 characters" }, { status: 400 });
                }
                const current = await redis.get("user_team:" + userId);
                if (typeof current === "string" && current.length > 0) {
                          return NextResponse.json({ error: "You already belong to a team" }, { status: 409 });
                }
                const team: Team = {
                          id: "team_" + Date.now().toString(36),
                          name,
                          owner: userId,
                          members: [{ userId, email, role: "owner", joined: Date.now() }],
                          created: Date.now(),
                };
                await redis.set("team:" + team.id, JSON.stringify(team));
                await redis.set("user_team:" + userId, team.id);
                return NextResponse.json({ team });
        }

      const teamId = await redis.get("user_team:" + userId);
        if (typeof teamId !== "string" || teamId.length === 0) {
                return action === "get"
                  ? NextResponse.json({ team: null })
                          : NextResponse.json({ error: "No team found" }, { status: 404 });
        }

      const team = parseTeam(await redis.get("team:" + teamId));
        if (!team) {
                return action === "get"
                  ? NextResponse.json({ team: null })
                          : NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

      if (action === "get") {
              return NextResponse.json({ team });
      }

      if (action === "invite") {
              const memberEmail = cleanEmail(body.memberEmail);
              if (!memberEmail) {
                        return NextResponse.json({ error: "memberEmail must be a valid address" }, { status: 400 });
              }
              if (team.owner !== userId) {
                        return NextResponse.json({ error: "Only the team owner can invite" }, { status: 403 });
              }
              if (team.members.length >= MAX_MEMBERS) {
                        return NextResponse.json({ error: "This team is full" }, { status: 409 });
              }
              if (team.members.some((member) => member.email.toLowerCase() === memberEmail)) {
                        return NextResponse.json({ error: "That member is already on the team" }, { status: 409 });
              }
              team.members.push({
                        email: memberEmail,
                        role: cleanRole(body.role),
                        joined: Date.now(),
                        status: "invited",
              });
              await redis.set("team:" + teamId, JSON.stringify(team));
              return NextResponse.json({ team });
      }

      if (action === "remove") {
              const memberEmail = cleanEmail(body.memberEmail);
              if (!memberEmail) {
                        return NextResponse.json({ error: "memberEmail must be a valid address" }, { status: 400 });
              }
              if (team.owner !== userId) {
                        return NextResponse.json({ error: "Only the team owner can remove members" }, { status: 403 });
              }
              // The owner row is never removable, otherwise a team could be orphaned.
          const remaining = team.members.filter(
                    (member) => member.role === "owner" || member.email.toLowerCase() !== memberEmail,
                  );
              if (remaining.length === team.members.length) {
                        return NextResponse.json({ error: "That member is not on the team" }, { status: 404 });
              }
              team.members = remaining;
              await redis.set("team:" + teamId, JSON.stringify(team));
              return NextResponse.json({ team });
      }

      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
        // Never echo the raw error: it can carry the Redis connection string.
      return NextResponse.json({ error: "Could not complete that team action" }, { status: 500 });
  }
}

export async function GET() {
    return NextResponse.json({
          service: "TokenSave Teams",
          description: "Create teams, invite members, manage roles",
          actions: { create: "Create a new team", invite: "Invite a member by email", remove: "Remove a member", get: "Get team details" },
          roles: ["owner", "admin", "member", "viewer"],
    });
}
