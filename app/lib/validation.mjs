import { AccessError } from "./security.mjs";
export const PROVIDERS = ["anthropic", "openai", "google", "groq"];
export function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function text(value, name, max = 200, min = 1) {
  if (
    typeof value !== "string" ||
    value.length < min ||
    value.length > max ||
    !value.trim()
  )
    throw new AccessError(400, "Invalid " + name + ".");
  return value;
}
function credential(value, name) {
  const key = text(value, name, 500, 10);
  if (!/^[\x21-\x7e]+$/.test(key))
    throw new AccessError(400, "Invalid " + name + ".");
  return key;
}
export function integer(value, name, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new AccessError(400, "Invalid " + name + ".");
  return value;
}
export function messages(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100)
    throw new AccessError(400, "Expected 1–100 messages.");
  return value.map((m) => {
    if (!record(m) || !["user", "assistant", "system"].includes(m.role))
      throw new AccessError(400, "Invalid message role.");
    return {
      role: m.role,
      content: text(m.content, "message content", 100000),
    };
  });
}
export function proxyInput(body) {
  const provider = body.provider === undefined ? "anthropic" : body.provider;
  if (!PROVIDERS.includes(provider))
    throw new AccessError(400, "Invalid provider.");
  const apiKey = credential(body.apiKey, "apiKey");
  const quality = body.quality === undefined ? "auto" : body.quality;
  if (!["auto", "max_savings", "max_quality"].includes(quality))
    throw new AccessError(400, "Invalid quality mode.");
  const model =
    body.model === undefined ? undefined : text(body.model, "model", 200);
  if (model && !/^[a-zA-Z0-9._:/-]+$/.test(model))
    throw new AccessError(400, "Invalid model.");
  const parsed = messages(body.messages);
  if (!parsed.some((m) => m.role !== "system"))
    throw new AccessError(400, "At least one non-system message is required.");
  const fallbackKeys = Object.create(null);
  if (body.fallbackKeys !== undefined) {
    if (!record(body.fallbackKeys) || Object.keys(body.fallbackKeys).length > 4)
      throw new AccessError(400, "Invalid fallbackKeys.");
    for (const [p, key] of Object.entries(body.fallbackKeys)) {
      if (!PROVIDERS.includes(p))
        throw new AccessError(400, "Invalid fallback provider.");
      fallbackKeys[p] = credential(key, "fallback credential");
    }
  }
  const tags = Object.create(null);
  if (body.tags !== undefined) {
    if (!record(body.tags) || Object.keys(body.tags).length > 20)
      throw new AccessError(400, "Invalid tags.");
    for (const [key, value] of Object.entries(body.tags))
      tags[text(key, "tag name", 50)] = text(value, "tag value", 200);
  }
  if (body.webhookUrl !== undefined)
    throw new AccessError(400, "Outbound webhook callbacks are disabled.");
  for (const name of [
    "stream",
    "tools",
    "temperature",
    "max_tokens",
    "maxTokens",
  ])
    if (body[name] !== undefined)
      throw new AccessError(400, "Unsupported parameter: " + name + ".");
  const tsKey =
    body.tsKey === undefined ? undefined : text(body.tsKey, "tsKey", 100);
  return {
    provider,
    apiKey,
    quality,
    model,
    messages: parsed,
    fallbackKeys,
    tags,
    tsKey,
  };
}
export function contextInput(body) {
  return {
    messages: messages(body.messages),
    maxTokens: integer(
      body.maxTokens === undefined ? 4000 : body.maxTokens,
      "maxTokens",
      1,
      1000000,
    ),
    keepRecent: integer(
      body.keepRecent === undefined ? 6 : body.keepRecent,
      "keepRecent",
      1,
      100,
    ),
  };
}
export const tokenEstimate = (message) => Math.ceil(message.content.length / 4);
export const totalEstimate = (list) =>
  list.reduce((sum, m) => sum + tokenEstimate(m), 0);
export function trimMessages(list, maxTokens, keepRecent = 1) {
  const nonSystem = list
    .map((m, i) => (m.role !== "system" ? i : -1))
    .filter((i) => i >= 0);
  const mandatory = new Set([
    ...list.map((m, i) => (m.role === "system" ? i : -1)).filter((i) => i >= 0),
    ...nonSystem.slice(-keepRecent),
  ]);
  let used = [...mandatory].reduce((sum, i) => sum + tokenEstimate(list[i]), 0);
  if (used > maxTokens)
    throw new AccessError(
      422,
      "Preserved messages exceed the estimated token budget. Increase maxTokens or reduce preserved content.",
    );
  const remaining = nonSystem.slice(
    0,
    Math.max(0, nonSystem.length - keepRecent),
  );
  for (let i = remaining.length - 1; i >= 0; i--) {
    const index = remaining[i],
      cost = tokenEstimate(list[index]);
    if (used + cost > maxTokens) break;
    mandatory.add(index);
    used += cost;
  }
  return list.filter((_m, i) => mandatory.has(i));
}
