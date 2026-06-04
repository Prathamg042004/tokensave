import { NextRequest, NextResponse } from "next/server";

// Simple in-memory cache (we will upgrade to Redis later)
const cache = new Map<string, { response: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

// Detect if a task is simple or complex
function detectComplexity(messages: any[]): "simple" | "complex" {
  const lastMessage = messages[messages.length - 1]?.content || "";
  const wordCount = lastMessage.split(" ").length;
  const complexKeywords = ["analyze", "code", "debug", "write a function", "explain in detail", "compare", "evaluate", "create a", "build", "design", "implement", "refactor", "optimize"];
  const isComplex = wordCount > 100 || complexKeywords.some((kw) => lastMessage.toLowerCase().includes(kw));
  return isComplex ? "complex" : "simple";
}

// Pick the best model based on complexity
function pickModel(complexity: "simple" | "complex", provider: string): string {
  if (provider === "anthropic") {
    return complexity === "simple" ? "claude-haiku-4-5-20241022" : "claude-sonnet-4-20250514";
  }
  if (provider === "openai") {
    return complexity === "simple" ? "gpt-4o-mini" : "gpt-4o";
  }
  return complexity === "simple" ? "gemini-1.5-flash" : "gemini-1.5-pro";
}

// Compress a prompt by removing extra whitespace and filler words
function compressPrompt(text: string): { compressed: string; savedChars: number } {
  const original = text.length;
  let compressed = text.replace(/\s+/g, " ").trim();
  compressed = compressed.replace(/\b(just|really|very|basically|actually|literally|simply|perhaps|maybe|I think|I believe|in my opinion|to be honest|as you know)\b/gi, "").replace(/\s+/g, " ").trim();
  return { compressed, savedChars: original - compressed.length };
}

// Create a cache key from messages
function getCacheKey(messages: any[]): string {
  return messages.map((m: any) => m.role + ":" + m.content).join("|");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, provider = "anthropic", apiKey, model: requestedModel } = body;

    if (!messages || !apiKey) {
      return NextResponse.json({ error: "messages and apiKey are required" }, { status: 400 });
    }

    // Step 1: Check cache
    const cacheKey = getCacheKey(messages);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        ...cached.response,
        tokensave_meta: { cache_hit: true, tokens_saved: "100%", method: "cache" },
      });
    }

    // Step 2: Detect complexity and pick model
    const complexity = detectComplexity(messages);
    const model = requestedModel || pickModel(complexity, provider);

    // Step 3: Compress the last message
    const lastMsg = messages[messages.length - 1];
    const { compressed, savedChars } = compressPrompt(lastMsg.content);
    const optimizedMessages = [...messages.slice(0, -1), { ...lastMsg, content: compressed }];

    // Step 4: Forward to the actual AI provider
    let apiUrl = "";
    let headers: any = { "Content-Type": "application/json" };
    let apiBody: any = {};

    if (provider === "anthropic") {
      apiUrl = "https://api.anthropic.com/v1/messages";
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      apiBody = { model, max_tokens: 1024, messages: optimizedMessages };
    } else if (provider === "openai") {
      apiUrl = "https://api.openai.com/v1/chat/completions";
      headers["Authorization"] = "Bearer " + apiKey;
      apiBody = { model, messages: optimizedMessages };
    } else {
      apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
      apiBody = { contents: optimizedMessages.map((m: any) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })) };
    }

    const aiResponse = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify(apiBody) });
    const aiData = await aiResponse.json();

    // Step 5: Cache the response
    cache.set(cacheKey, { response: aiData, timestamp: Date.now() });

    // Step 6: Return with metadata
    return NextResponse.json({
      ...aiData,
      tokensave_meta: {
        cache_hit: false,
        model_used: model,
        complexity,
        chars_saved: savedChars,
        method: complexity === "simple" ? "routed_to_cheap" : "routed_to_smart",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
