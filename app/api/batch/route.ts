import { NextRequest, NextResponse } from "next/server";
import { POST as proxyPost } from "../proxy/route";
import { readJson, accessResponse, AccessError } from "../../lib/security.mjs";
import { text, record, proxyInput } from "../../lib/validation.mjs";
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    if (
      !Array.isArray(body.prompts) ||
      body.prompts.length < 1 ||
      body.prompts.length > 50
    )
      throw new AccessError(400, "Expected 1–50 prompts.");
    // Validate the entire batch before any provider call can incur a charge.
    const prompts = body.prompts.map((p) =>
      text(record(p) ? p.content : p, "prompt", 100000),
    );
    const input = proxyInput({
      ...body,
      messages: [{ role: "user", content: prompts[0] }],
    });
    const start = Date.now(),
      signal = AbortSignal.any([req.signal, AbortSignal.timeout(45000)]);
    const results: {
      prompt: string;
      status: string;
      response?: Record<string, unknown>;
      error?: string;
    }[] = [];
    for (const prompt of prompts) {
      if (signal.aborted) {
        results.push({
          prompt,
          status: "error",
          error: "Batch deadline reached; item was not sent.",
        });
        continue;
      }
      const response = await proxyPost(
        new NextRequest(new URL("/api/proxy", req.url), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...input,
            messages: [{ role: "user", content: prompt }],
          }),
          signal,
        }),
      );
      const data: unknown = await response.json();
      results.push({
        prompt,
        status: response.ok ? "success" : "error",
        response: record(data) ? data : { error: "Invalid response" },
      });
    }
    return NextResponse.json(
      {
        batch_id: crypto.randomUUID(),
        total: prompts.length,
        successful: results.filter((r) => r.status === "success").length,
        cached: results.filter(
          (r) =>
            record(r.response?.tokensave_meta) &&
            r.response.tokensave_meta.cache_hit === true,
        ).length,
        processing_time_ms: Date.now() - start,
        results,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return accessResponse(error);
  }
}
export async function GET() {
  return NextResponse.json({
    service: "TokenSave Batch API",
    description:
      "Sequential processing of 1–50 validated text prompts with a shared 45-second deadline. Results identify unprocessed items.",
  });
}
