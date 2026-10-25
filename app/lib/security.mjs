import { createHmac } from 'node:crypto';

export class AccessError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Verify identity with the auth service; never trust a userId sent by a client.
export async function requireUser(request, fetcher = fetch) {
  const authorization = request.headers.get('authorization') || '';
  if (!/^Bearer [^\s]+$/.test(authorization)) throw new AccessError(401, 'Sign in required.');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new AccessError(503, 'Authentication is unavailable.');
  let response;
  try {
    response = await fetcher(new URL('/auth/v1/user', url), {
      headers: { authorization, apikey: key }, cache: 'no-store',
      redirect: 'error', signal: AbortSignal.timeout(8000),
    });
  } catch { throw new AccessError(503, 'Authentication is unavailable.'); }
  if (!response.ok) throw new AccessError(response.status >= 500 ? 503 : 401, 'Unable to verify session.');
  const user = await response.json();
  if (!user || typeof user.id !== 'string' || !user.id) throw new AccessError(401, 'Unable to verify session.');
  return { id: user.id, email: typeof user.email === 'string' ? user.email : '' };
}

export function assertOwner(claimedId, verifiedId) {
  if (claimedId !== undefined && claimedId !== verifiedId) throw new AccessError(403, 'Account mismatch.');
}

export async function keyOwner(redis, key) {
  if (!redis) throw new AccessError(503, 'Storage is unavailable.');
  if (typeof key !== 'string' || !/^ts_live_[a-z0-9]{32,64}$/.test(key)) throw new AccessError(401, 'Invalid API key.');
  const raw = await redis.get('key_owner:' + key);
  let owner;
  try { owner = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch {}
  if (!owner || typeof owner.userId !== 'string') throw new AccessError(401, 'Invalid API key.');
  if (await redis.get('user_key:' + owner.userId) !== key) throw new AccessError(401, 'Invalid API key.');
  return owner.userId;
}

// Key the cache namespace with the high-entropy provider API credential.
// This is a cache authenticator, not a password verifier; never persist the credential.
export function privateCacheKey(messages, provider, model, quality, apiKey) {
  return 'cache:v3:' + createHmac('sha256', apiKey).update(JSON.stringify({ messages, provider, model, quality })).digest('hex');
}

export function accessResponse(error) {
  return Response.json({ error: error instanceof AccessError ? error.message : 'Request could not be completed.' }, {
    status: error instanceof AccessError ? error.status : 500,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function readJson(request, maxBytes = 500000) {
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, 'JSON body required.');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new AccessError(413, 'Request body too large.'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AccessError(400, 'Valid JSON required.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AccessError(400, 'JSON object required.');
  return body;
}

// One atomic operation prevents counters without expiry and concurrent overshoot.
export const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;

export function rateLimitScope(userId, provider, apiKey) {
  if (userId) return 'account:' + userId;
  // Anonymous BYOK calls share a budget for the same provider credential.
  return 'credential:' + createHmac('sha256', apiKey).update('tokensave-rate-v1:' + provider).digest('hex');
}

export async function consumeRateLimit(redis, scope, limit = 60, windowSeconds = 60) {
  if (!redis) throw new AccessError(503, 'Request limiting is unavailable.');
  let result;
  try { result = await redis.eval(RATE_LIMIT_SCRIPT, ['rl:v2:' + scope], [windowSeconds]); }
  catch { throw new AccessError(503, 'Request limiting is unavailable.'); }
  if (!Array.isArray(result) || result.length !== 2 ||
      !Number.isSafeInteger(result[0]) || result[0] < 1 ||
      !Number.isSafeInteger(result[1]) || result[1] < 0 || result[1] > windowSeconds) {
    throw new AccessError(503, 'Request limiting is unavailable.');
  }
  return { count: result[0], allowed: result[0] <= limit, retryAfter: Math.max(1, result[1]) };
}
