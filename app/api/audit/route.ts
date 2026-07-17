import { NextRequest, NextResponse } from "next/server";
import { safeListGet } from "../../redis";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ts_live_")) {
    return NextResponse.json(
      { error: "Authentication required. Pass your TokenSave API key as Bearer token." },
      { status: 401 }
    );
  }

  try {
    const logs = await safeListGet("audit_log", 0, 99);
    const parsed = logs.map((l: any) => {
      try { return typeof l === "string" ? JSON.parse(l) : l; } catch { return l; }
    });

    return NextResponse.json({
      service: "TokenSave Audit Log",
      total: parsed.length,
      entries: parsed,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}