import type { Message, Provider, QualityMode } from "../types";
export const PROVIDERS: Provider[];
export function record(value: unknown): value is Record<string, unknown>;
export function text(
  value: unknown,
  name: string,
  max?: number,
  min?: number,
): string;
export function integer(
  value: unknown,
  name: string,
  min: number,
  max: number,
): number;
export function messages(value: unknown): Message[];
export function proxyInput(body: Record<string, unknown>): {
  provider: Provider;
  apiKey: string;
  quality: QualityMode;
  model?: string;
  messages: Message[];
  fallbackKeys: Record<string, string>;
  tags: Record<string, string>;
  tsKey?: string;
};
export function contextInput(body: Record<string, unknown>): {
  messages: Message[];
  maxTokens: number;
  keepRecent: number;
};
export function tokenEstimate(message: Message): number;
export function totalEstimate(list: Message[]): number;
export function trimMessages(
  list: Message[],
  maxTokens: number,
  keepRecent?: number,
): Message[];
