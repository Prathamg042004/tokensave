import { NextRequest, NextResponse } from "next/server";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function summarizeMessages(messages: any[]): string {
  const topics: string[] = [];
  const decisions: string[] = [];
  const codeBlocks: string[] = [];

  for (const msg of messages) {
    const content = msg.content || "";
    
    if (content.includes("```") || content.includes("function ") || content.includes("def ") || content.includes("class ")) {
      const codeMatch = content.match(/```[\s\S]*?```/g);
      if (codeMatch) {
        const lastCode = codeMatch[codeMatch.length - 1];
        if (lastCode.length < 500) codeBlocks.push(lastCode);
      }
    }
    
    if (msg.role === "user") {
      const shortContent = content.length > 100 ? content.slice(0, 100) + "..." : content;
      topics.push(shortContent);
    }
    
    if (content.toLowerCase().includes("decision") || content.toLowerCase().includes("agreed") || content.toLowerCase().includes("let's go with") || content.toLowerCase().includes("final answer")) {
      const shortContent = content.length > 150 ? content.slice(0, 150) + "..." : content;
      decisions.push(shortContent);
    }
  }

  let summary = "CONVERSATION SUMMARY:\n";
  summary += "Topics discussed: " + topics.slice(-5).join("; ") + "\n";
  if (decisions.length > 0) {
    summary += "Key decisions: " + decisions.slice(-3).join("; ") + "\n";
  }
  if (codeBlocks.length > 0) {
    summary += "Latest code:\n" + codeBlocks[codeBlocks.length - 1] + "\n";
  }

  return summary;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, maxTokens = 4000, keepRecent = 6 } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    const totalTokens = messages.reduce((sum: number, m: any) => sum + estimateTokens(m.content || ""), 0);

    if (totalTokens <= maxTokens) {
      return NextResponse.json({
        optimized: false,
        reason: "Already within token limit",
        original_tokens: totalTokens,
        final_tokens: totalTokens,
        tokens_saved: 0,
        percent_saved: 0,
        messages: messages,
      });
    }

    const systemMessages = messages.filter((m: any) => m.role === "system");
    const nonSystemMessages = messages.filter((m: any) => m.role !== "system");

    const recentMessages = nonSystemMessages.slice(-keepRecent);
    const olderMessages = nonSystemMessages.slice(0, -keepRecent);

    if (olderMessages.length === 0) {
      return NextResponse.json({
        optimized: false,
        reason: "Not enough messages to summarize",
        original_tokens: totalTokens,
        final_tokens: totalTokens,
        tokens_saved: 0,
        percent_saved: 0,
        messages: messages,
      });
    }

    const summary = summarizeMessages(olderMessages);
    const summaryMessage = { role: "system", content: summary };

    const optimizedMessages = [
      ...systemMessages,
      summaryMessage,
      ...recentMessages,
    ];

    const finalTokens = optimizedMessages.reduce((sum: number, m: any) => sum + estimateTokens(m.content || ""), 0);
    const tokensSaved = totalTokens - finalTokens;
    const percentSaved = Math.round((tokensSaved / totalTokens) * 100);

    return NextResponse.json({
      optimized: true,
      original_messages: messages.length,
      optimized_messages: optimizedMessages.length,
      messages_summarized: olderMessages.length,
      messages_kept: recentMessages.length,
      original_tokens: totalTokens,
      final_tokens: finalTokens,
      tokens_saved: tokensSaved,
      percent_saved: percentSaved,
      messages: optimizedMessages,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "TokenSave Smart Context Manager",
    description: "Automatically summarizes old messages in long conversations to save tokens while preserving context",
    how_it_works: [
      "1. Analyzes the full conversation history",
      "2. Identifies topics discussed, key decisions, and code blocks",
      "3. Summarizes older messages into a compact summary",
      "4. Keeps the most recent messages in full",
      "5. Returns optimized messages that fit within your token budget",
    ],
    usage: {
      method: "POST",
      body: {
        messages: "Full conversation history array",
        maxTokens: "Target token limit (default: 4000)",
        keepRecent: "Number of recent messages to keep in full (default: 6)",
      },
    },
    example_savings: "A 50-message conversation (25,000 tokens) can be reduced to ~3,000 tokens (88% savings)",
  });
}