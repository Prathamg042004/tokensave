import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

let redis: any = null;
try {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  });
} catch (e) {}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, teamName, memberEmail, role = "member" } = body;

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    if (action === "create") {
      if (!teamName) return NextResponse.json({ error: "teamName required" }, { status: 400 });
      const team = {
        id: "team_" + Date.now().toString(36),
        name: teamName,
        owner: userId,
        members: [{ userId, email: body.email || "", role: "owner", joined: Date.now() }],
        created: Date.now(),
      };
      if (redis) {
        await redis.set("team:" + team.id, JSON.stringify(team));
        await redis.set("user_team:" + userId, team.id);
      }
      return NextResponse.json({ team });
    }

    if (action === "invite") {
      if (!memberEmail) return NextResponse.json({ error: "memberEmail required" }, { status: 400 });
      const teamId = redis ? await redis.get("user_team:" + userId) : null;
      if (!teamId) return NextResponse.json({ error: "No team found" }, { status: 404 });
      const teamData = redis ? await redis.get("team:" + teamId) : null;
      if (!teamData) return NextResponse.json({ error: "Team not found" }, { status: 404 });
      const team = typeof teamData === "string" ? JSON.parse(teamData) : teamData;
      if (team.owner !== userId) return NextResponse.json({ error: "Only team owner can invite" }, { status: 403 });
      team.members.push({ email: memberEmail, role, joined: Date.now(), status: "invited" });
      if (redis) await redis.set("team:" + teamId, JSON.stringify(team));
      return NextResponse.json({ team });
    }

    if (action === "remove") {
      if (!memberEmail) return NextResponse.json({ error: "memberEmail required" }, { status: 400 });
      const teamId = redis ? await redis.get("user_team:" + userId) : null;
      if (!teamId) return NextResponse.json({ error: "No team found" }, { status: 404 });
      const teamData = redis ? await redis.get("team:" + teamId) : null;
      if (!teamData) return NextResponse.json({ error: "Team not found" }, { status: 404 });
      const team = typeof teamData === "string" ? JSON.parse(teamData) : teamData;
      if (team.owner !== userId) return NextResponse.json({ error: "Only team owner can remove" }, { status: 403 });
      team.members = team.members.filter((m: any) => m.email !== memberEmail);
      if (redis) await redis.set("team:" + teamId, JSON.stringify(team));
      return NextResponse.json({ team });
    }

    if (action === "get") {
      const teamId = redis ? await redis.get("user_team:" + userId) : null;
      if (!teamId) return NextResponse.json({ team: null });
      const teamData = redis ? await redis.get("team:" + teamId) : null;
      if (!teamData) return NextResponse.json({ team: null });
      const team = typeof teamData === "string" ? JSON.parse(teamData) : teamData;
      return NextResponse.json({ team });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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