export type Provider = "anthropic" | "openai" | "google" | "groq";
export type Quality = "auto" | "max_savings" | "max_quality";
export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}
export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  cache_write_5m_tokens: number;
  cache_write_1h_tokens: number;
  total_tokens: number;
}
export interface Accounting {
  model_used: string;
  usage_source: string;
  usage: Usage | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost: number | null;
  cost_saved: number | null;
  cost_without_optimization: number | null;
  cost_source: string;
  cost_unavailable_reason: string | null;
  currency: "USD";
  pricing_version: string;
  savings_basis: string;
  savings_percent: number | null;
  tokens_saved: number | null;
}
export interface Meta extends Accounting {
  cache: boolean;
  cache_hit: boolean;
  latency: number;
  provider: Provider;
  model: string;
  complexity: "simple" | "complex";
  charsSaved: number;
  fallback?: Provider;
}
export interface Completion {
  _tokensave: Meta;
  [key: string]: unknown;
}
export interface Config {
  provider?: Provider;
  apiKey?: string;
  fallbackKeys?: Partial<Record<Provider, string>>;
  quality?: Quality;
  cache?: boolean;
  routing?: boolean;
  compression?: boolean;
  cacheTTL?: number;
  maxCacheEntries?: number;
  timeoutMs?: number;
  maxTokens?: number;
  simpleModel?: string;
  complexModel?: string;
  fetch?: typeof fetch;
}
export class TokenSaveError extends Error {
  status: number | null;
  provider: Provider | null;
  code: string;
}
export class TokenSave {
  constructor(config?: Config);
  chat(
    prompt: string | Message[],
    options?: { model?: string; maxTokens?: number; signal?: AbortSignal },
  ): Promise<Completion>;
  clearCache(): void;
  getStats(): {
    requests: number;
    cacheHits: number;
    tokensSaved: number;
    totalCost: number;
    totalSaved: number;
    unknownCostRequests: number;
    unknownSavingsRequests: number;
    errors: number;
    latencies: number[];
    avgLatency: number;
    currency: string;
    costSource: string;
    savingsBasis: string;
  };
}
export function providerRequest(
  provider: string,
  model: string,
  key: string,
  messages: { role: string; content: string }[],
  maxTokens: number,
): { url: string; headers: Record<string, string>; body: unknown };
export function validResponse(provider: string, data: unknown): boolean;
export function validateMessages(messages: unknown): Message[];
export const MODELS: Record<Provider, { simple: string; complex: string }>;
