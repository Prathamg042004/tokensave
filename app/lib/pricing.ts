// Pure pricing and token helpers, extracted from app/api/proxy/route.ts
// so they can be unit tested in isolation (no network, no Redis).
//
// These MUST stay identical to the PRICING table and the estimateTokens /
// calculateCost logic used by the proxy. A follow-up change should make
// route.ts import from this module so there is a single source of truth.
// Guarded by tests/optimize.test.mjs.

// Model pricing per million tokens: [inputRate, outputRate]
export const PRICING: Record<string, [number, number]> = {
  "claude-haiku-4-5-20251001": [0.80, 4.00],
  "claude-sonnet-4-6": [3.00, 15.00],
  "claude-opus-4-8": [15.00, 75.00],
  "gpt-4o-mini": [0.15, 0.60],
  "gpt-4o": [2.50, 10.00],
  "gpt-4-turbo": [10.00, 30.00],
  "gemini-2.0-flash-lite": [0.075, 0.30],
  "gemini-2.0-flash": [0.15, 0.60],
  "gemini-1.5-pro": [1.25, 5.00],
  "llama-3.1-8b-instant": [0.05, 0.08],
  "llama-3.3-70b-versatile": [0.59, 0.79],
  "mixtral-8x7b-32768": [0.24, 0.24],
  "deepseek-r1-distill-llama-70b": [0.75, 0.99],
};

// Rough token estimate: ~4 characters per token. Never negative.
export function estimateTokens(text: string): number {
  return Math.ceil((text || "").length / 4);
}

// Cost in dollars for a request. Unknown models fall back to [1, 5]
// so an unpriced model is never silently billed at zero.
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const p = PRICING[model] || [1, 5];
  return (inputTokens * p[0] + outputTokens * p[1]) / 1000000;
}
