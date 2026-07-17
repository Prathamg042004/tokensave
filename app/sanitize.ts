const MAX_MESSAGE_LENGTH = 100000;
const MAX_MESSAGES = 100;
const MAX_BODY_SIZE = 500000;

export function sanitizeMessages(messages: any[]): { clean: any[]; error: string | null } {
  if (!Array.isArray(messages)) return { clean: [], error: "messages must be an array" };
  if (messages.length === 0) return { clean: [], error: "messages must not be empty" };
  if (messages.length > MAX_MESSAGES) return { clean: [], error: `Maximum ${MAX_MESSAGES} messages allowed` };

  const clean = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (!msg || typeof msg !== "object") {
      return { clean: [], error: `messages[${i}] is invalid` };
    }

    if (!msg.role || !["user", "assistant", "system"].includes(msg.role)) {
      return { clean: [], error: `messages[${i}].role must be user, assistant, or system` };
    }

    if (typeof msg.content !== "string") {
      return { clean: [], error: `messages[${i}].content must be a string` };
    }

    if (msg.content.length > MAX_MESSAGE_LENGTH) {
      return { clean: [], error: `messages[${i}].content exceeds ${MAX_MESSAGE_LENGTH} character limit` };
    }

    clean.push({
      role: msg.role,
      content: msg.content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""),
    });
  }

  return { clean, error: null };
}

export function sanitizeApiKey(key: any): { clean: string; error: string | null } {
  if (!key || typeof key !== "string") return { clean: "", error: "apiKey is required" };
  if (key.length < 10) return { clean: "", error: "apiKey is too short" };
  if (key.length > 500) return { clean: "", error: "apiKey is too long" };
  if (/[\s<>{}]/.test(key)) return { clean: "", error: "apiKey contains invalid characters" };
  return { clean: key.trim(), error: null };
}

export function sanitizeProvider(provider: any): { clean: string; error: string | null } {
  const valid = ["anthropic", "openai", "google", "groq"];
  if (!provider || typeof provider !== "string") return { clean: "anthropic", error: null };
  const cleaned = provider.toLowerCase().trim();
  if (!valid.includes(cleaned)) return { clean: "", error: `Invalid provider. Use: ${valid.join(", ")}` };
  return { clean: cleaned, error: null };
}

export function sanitizeTags(tags: any): Record<string, string> {
  if (!tags || typeof tags !== "object") return {};
  const clean: Record<string, string> = {};
  const entries = Object.entries(tags);
  if (entries.length > 20) return {};
  for (const [key, value] of entries.slice(0, 20)) {
    if (typeof key === "string" && typeof value === "string") {
      clean[key.slice(0, 50)] = String(value).slice(0, 200);
    }
  }
  return clean;
}

export function checkBodySize(body: string): boolean {
  return body.length <= MAX_BODY_SIZE;
}