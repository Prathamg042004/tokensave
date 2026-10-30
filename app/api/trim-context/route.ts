import { NextResponse } from "next/server";
import { readJson, accessResponse } from "../../lib/security.mjs";
import {
  contextInput,
  trimMessages,
  totalEstimate,
} from "../../lib/validation.mjs";

export async function POST(req: Request) {
  try {
    const { messages, maxTokens } = contextInput(await readJson(req));
    const trimmed = trimMessages(messages, maxTokens);
    const original = totalEstimate(messages),
      final = totalEstimate(trimmed);
    return NextResponse.json(
      {
        original_messages: messages.length,
        trimmed_messages: trimmed.length,
        messages_removed: messages.length - trimmed.length,
        original_tokens: original,
        final_tokens: final,
        tokens_saved: original - final,
        trimmed,
        token_count_source: "character_estimate",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return accessResponse(error);
  }
}
export async function GET() {
  return NextResponse.json({
    service: "TokenSave Context Window Manager",
    description:
      "Preserves system messages and the latest conversation turn. Enforces a character-based estimated budget; returns 422 when preserved messages cannot fit.",
  });
}
