import { NextRequest, NextResponse } from "next/server";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function trimContext(messages: any[], maxTokens: number): { trimmed: any[]; removed: number; tokensSaved: number } {
  const totalTokens = messages.reduce((sum: number, m: any) => sum + estimateTokens(m.content), 0);

  if (totalTokens <= maxTokens) {
    return { trimmed: messages, removed: 0, tokensSaved: 0 };
  }

  const systemMessages = messages.filter((m: any) => m.role === "system");
  const lastMessage = messages[messages.length - 1];
  const conversationMessages = messages.filter((m: any) => m.role !== "system").slice(0, -1);

  const reserved = systemMessages.reduce((sum: number, m: any) => sum + estimateTokens(m.content), 0) + estimateTokens(lastMessage.content);
  const available = maxTokens - reserved;

  const kept = [];
  let usedTokens = 0;

  for (let i = conversationMessages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(conversationMessages[i].content);
    if (usedTokens + msgTokens <= available) {
      kept.unshift(conversationMessages[i]);
      usedTokens += msgTokens;
    }
  }

  const trimmed = [...systemMessages, ...kept, lastMessage];
  const removed = messages.length - trimmed.length;
  const savedTokens = totalTokens - trimmed.reduce((sum: number, m: any) => sum + estimateTokens(m.content), 0);

  return { trimmed, removed, tokensSaved: savedTokens };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, maxTokens = 4000 } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    const originalTokens = messages.reduce((sum: number, m: any) => sum + estimateTokens(m.content), 0);
    const result = trimContext(messages, maxTokens);

    return NextResponse.json({
      original_messages: messages.length,
      trimmed_messages: result.trimmed.length,
      messages_removed: result.removed,
      original_tokens: originalTokens,
      final_tokens: originalTokens - result.tokensSaved,
      tokens_saved: result.tokensSaved,
      trimmed: result.trimmed,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}export async function GET() {
    return NextResponse.json({
      service: "TokenSave Context Window Manager",
      description: "Automatically trim old messages from long conversations to save tokens",
      usage: {
        method: "POST",
        body: {
          messages: [
            { role: "system", content: "system prompt" },
            { role: "user", content: "message 1" },
            { role: "assistant", content: "reply 1" },
            { role: "user", content: "latest message" }
          ],
          maxTokens: 4000,
        },
      },
    });
  }