import { NextRequest, NextResponse } from "next/server";
import { authenticate, forbidden, serverError, unauthorized } from "@/lib/auth";
import { getRedis, parseJson } from "@/lib/redis";

/**
 * Team management.
 *
 * Every action previously acted on whatever userId was posted, so any
 * anonymous caller could create teams, invite members to somebody else's team
 * or read its membership. The acting user is now taken from the verified
 * credential and ownership is re-checked on every mutation.
 */

const MAX_MEMBERS = 50;
const TEAM_NAME_MAX = 80;

type Member = {
  userId?: string;
  email: string;
  role: string;
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

const ROLES = new Set(["member", "admin", "viewer"]);

function normaliseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export async function POST(req: NextRequest) {
  const identity = await authenticate(req);
  if (!identity) return unauthorized();

  try {
    const redis = getRedis();
    if (!redis) return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "A JSON body is required" }, { status: 400 });
    }

    const action = typeof body.action === "string" ? body.action : "get";
    const userId = identity.userId;

    if (action === "create") {
      const name = typeof body.teamName === "string" ? body.teamName.trim() : "";
      if (!name || name.length > TEAM_NAME_MAX) {
        return NextResponse.json(
          { error: "teamName is required and must be at most " + TEAM_NAME_MAX + " characters" },
          { status: 400 }
        );
      }

      const existingTeamId = await redis.get("user_team:" + userId);
      if (existingTeamId) {
        return NextResponse.json({ error: "You already belong to a team" }, { status: 409 });
      }

      const team: Team = {
        id: "team_" + crypto.randomUUID(),
        name,
        owner: userId,
        members: [
          {
            userId,
            email: identity.email ?? "",
            role: "owner",
            joined: Date.now(),
          },
        ],
        created: Date.now(),
      };

      await redis.set("team:" + team.id, JSON.stringify(team));
      await redis.set("user_team:" + userId, team.id);
      return NextResponse.json({ team });
    }

    const teamId = await redis.get("user_team:" + userId);
    if (typeof teamId !== "string" || !teamId) {
      return action === "get"
        ? NextResponse.json({ team: null })
        : NextResponse.json({ error: "No team found" }, { status: 404 });
    }

    const team = parseJson<Team>(await redis.get("team:" + teamId));
    if (!team) {
      return action === "get"
        ? NextResponse.json({ team: null })
        : NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (action === "get") {
      return NextResponse.json({ team });
    }

    if (team.owner !== userId) {
      return forbidden("Only the team owner can modify membership");
    }

    if (action === "invite") {
      const email = normaliseEmail(body.memberEmail);
      if (!email) return NextResponse.json({ error: "A valid memberEmail is required" }, { status: 400 });

      const role = typeof body.role === "string" && ROLES.has(body.role) ? body.role : "member";
      if (team.members.length >= MAX_MEMBERS) {
        return NextResponse.json({ error: "Team member limit reached" }, { status: 409 });
      }
      if (team.members.some((member) => member.email.toLowerCase() === email)) {
        return NextResponse.json({ error: "That member is already on the team" }, { status: 409 });
      }

      team.members.push({ email, role, joined: Date.now(), status: "invited" });
      await redis.set("team:" + teamId, JSON.stringify(team));
      return NextResponse.json({ team });
    }

    if (action === "remove") {
      const email = normaliseEmail(body.memberEmail);
      if (!email) return NextResponse.json({ error: "A valid memberEmail is required" }, { status: 400 });

      team.members = team.members.filter(
        (member) => member.email.toLowerCase() !== email || member.role === "owner"
      );
      await redis.set("team:" + teamId, JSON.stringify(team));
      return NextResponse.json({ team });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return serverError("teams", error);
  }
}

export async function GET() {
  return NextResponse.json({
    service: "TokenSave Teams",
    authentication: "Bearer <supabase access token> or a TokenSave API key",
    actions: ["create", "invite", "remove", "get"],
  });
}
