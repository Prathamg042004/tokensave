import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    { error: "Client-supplied usage counters are not accepted." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
export async function GET() {
  return NextResponse.json({
    service: "TokenSave Analytics",
    ingestion_enabled: false,
    description:
      "Client-supplied usage counters are disabled. Authenticated per-account metrics are available from /api/stats.",
  });
}
