export class AccessError extends Error { status: number; constructor(status: number, message: string); }
export function requireUser(request: Request, fetcher?: typeof fetch): Promise<{id: string; email: string}>;
export function assertOwner(claimedId: unknown, verifiedId: string): void;
export function keyOwner(redis: {get(key: string): Promise<unknown>} | null, key: unknown): Promise<string>;
export function privateCacheKey(messages: unknown[], provider: string, model: string, quality: string, apiKey: string): string;
export function accessResponse(error: unknown): Response;
export function readJson(request: Request, maxBytes?: number): Promise<Record<string, any>>;
