import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompts, provider = "anthropic", apiKey } = body;

    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json({ error: "prompts array is required" }, { status: 400 });
    }

    if (prompts.length > 50) {
      return NextResponse.json({ error: "Maximum 50 prompts per batch" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
    }

    const results = [];
    const startTime = Date.now();

    for (const prompt of prompts) {
      try {
        const res = await fetch("https://tokensave.vercel.app/api/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            apiKey,
            messages: [{ role: "user", content: typeof prompt === "string" ? prompt : prompt.content }],
          }),
        });
        const data = await res.json();
        results.push({
          prompt: typeof prompt === "string" ? prompt : prompt.content,
          status: "success",
          response: data,
        });
      } catch (e: any) {
        results.push({
          prompt: typeof prompt === "string" ? prompt : prompt.content,
          status: "error",
          error: e.message,
        });
      }
    }

    const totalTime = Date.now() - startTime;
    const successful = results.filter((r) => r.status === "success").length;
    const cached = results.filter((r) => r.response?.tokensave_meta?.cache_hit).length;

    return NextResponse.json({
      batch_id: "batch_" + Date.now().toString(36),
      total: prompts.length,
      successful,
      cached,
      processing_time_ms: totalTime,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "TokenSave Batch API",
    description: "Process multiple prompts in a single request",
    usage: {
      method: "POST",
      body: {
        provider: "anthropic | openai | google | groq",
        apiKey: "your-api-key",
        prompts: ["prompt 1", "prompt 2", "prompt 3"],
      },
      limits: "Maximum 50 prompts per batch",
    },
  });
}