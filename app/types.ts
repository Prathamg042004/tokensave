export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ProxyRequest {
  messages: Message[];
  provider: "anthropic" | "openai" | "google" | "groq";
  apiKey: string;
  model?: string;
  quality?: "auto" | "max_savings" | "max_quality";
  fallbackKeys?: Record<string, string>;
  tags?: Record<string, string>;
  userId?: string;
  webhookUrl?: string;
}

export interface TokenSaveMeta {
  request_id: string;
  cache_hit: boolean;
  model_used: string;
  complexity: "simple" | "complex";
  chars_saved: number;
  quality_mode: string;
  latency_ms: number;
  method: string;
  cost?: number | null;
  cost_without_optimization?: number | null;
  savings_percent?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cost_saved?: number | null;
  usage_source?: string;
  cost_source?: string;
  cost_unavailable_reason?: string | null;
  savings_basis?: string;
  currency?: "USD";
  pricing_version?: string;
  tags?: Record<string, string>;
  is_error?: boolean;
  fallback_used?: boolean;
  original_provider?: string;
  fallback_provider?: string;
  note?: string;
}

export interface ProxyResponse {
  tokensave_meta: TokenSaveMeta;
  [key: string]: unknown;
}

export interface DayStats {
  date: string;
  label: string;
  total_requests: number;
  tokens_saved: number;
  cache_hits: number;
  total_input_tokens: number;
  total_output_tokens: number;
  errors: number;
  unknown_cost_requests?: number;
  total_cost: number;
  total_saved: number;
}

export interface StatsResponse {
  days: DayStats[];
  totals: {
    total_requests: number;
    tokens_saved: number;
    cache_hits: number;
    total_input_tokens: number;
    total_output_tokens: number;
    errors: number;
    unknown_cost_requests?: number;
    total_cost: number;
    total_saved: number;
  };
  recent_logs: RequestLog[];
  performance: {
    avg_latency_ms: number;
    p95_latency_ms: number;
    error_rate_percent: number;
    cache_hit_rate: number;
  };
}

export interface RequestLog {
  id: string;
  timestamp: number;
  provider: string;
  model: string;
  cache_hit: boolean;
  tokens_saved: number;
  complexity: string;
  latency: number;
  cost: number | null;
  cost_saved: number | null;
  is_error: boolean;
  error_code?: number;
  error_message?: string;
  userId?: string;
  tags?: Record<string, string>;
}

export interface Team {
  id: string;
  name: string;
  owner: string;
  members: TeamMember[];
  created: number;
}

export interface TeamMember {
  userId?: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  joined: number;
  status?: "active" | "invited";
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  created: number;
  active: boolean;
}

export type Provider = "anthropic" | "openai" | "google" | "groq";
export type QualityMode = "auto" | "max_savings" | "max_quality";
export type Complexity = "simple" | "complex";
