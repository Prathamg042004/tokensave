import { NextResponse } from "next/server";

export function successResponse(data: any, status: number = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "X-Powered-By": "TokenSave",
      "X-Version": "3.0.0",
    },
  });
}

export function errorResponse(message: string, status: number = 400, meta?: any) {
  return NextResponse.json(
    {
      error: { message, code: status },
      ...(meta ? { tokensave_meta: meta } : {}),
    },
    {
      status,
      headers: {
        "X-Powered-By": "TokenSave",
        "X-Version": "3.0.0",
      },
    }
  );
}

export function validateRequired(body: any, fields: string[]): string | null {
  for (const field of fields) {
    if (!body[field]) {
      return `${field} is required`;
    }
  }
  return null;
}

export function validateApiKey(apiKey: any): string | null {
  if (!apiKey || typeof apiKey !== "string") return "apiKey is required";
  if (apiKey.length < 10) return "apiKey appears invalid (too short)";
  return null;
}

export function validateProvider(provider: string): string | null {
  const valid = ["anthropic", "openai", "google", "groq"];
  if (!valid.includes(provider)) {
    return `Invalid provider "${provider}". Use: ${valid.join(", ")}`;
  }
  return null;
}

export function validateMessages(messages: any): string | null {
  if (!messages) return "messages is required";
  if (!Array.isArray(messages)) return "messages must be an array";
  if (messages.length === 0) return "messages must not be empty";
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg.role || !msg.content) {
      return `messages[${i}] must have role and content`;
    }
    if (!["user", "assistant", "system"].includes(msg.role)) {
      return `messages[${i}].role must be user, assistant, or system`;
    }
  }
  return null;
}

export function estimateTokens(text: string): number {
  return Math.ceil((text || "").length / 4);
}

export function generateId(prefix: string = "req"): string {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}