# Security hardening — October 2026

This change strengthens account boundaries. It is not a penetration-test certification or a claim of production readiness.

## Behavior changes

- Key provisioning/rotation, team management, webhook management, and dashboard statistics require a Supabase access token in `Authorization: Bearer <access_token>`.
- The server verifies that token with the configured Supabase auth service. Client-supplied account IDs cannot select another account.
- Key creation uses cryptographic randomness and atomic Redis replacement. Audit access requires a stored, current TokenSave key, not merely the correct prefix.
- Cached provider responses use an HMAC-SHA-256 namespace keyed by the provider credential and covering messages, provider, requested model, and quality. Old shared cache entries are no longer read. Fallback responses do not populate the primary provider cache.
- Account statistics and logs use the verified account namespace. Historical global metrics are intentionally not exposed or migrated into individual accounts. Include a valid `tsKey` on proxy calls to attribute usage to an account; anonymous BYOK requests are not assigned to a caller-provided account ID.
- Arbitrary outbound webhook delivery/testing is disabled until a safe egress implementation exists. Management requests remain authenticated. Do not interpret saved webhook configuration as proof of delivery.
- Client-supplied aggregate analytics are rejected. Provider calls have timeouts and reject redirects. Batch requests invoke the local proxy handler, so a self-hosted instance does not send provider keys to the public hosted instance.
- Request-body byte limits are enforced while reading the stream, including when Content-Length is absent.

## Validation

`npm test` includes account-isolation, invalid/rotated-key, cache-isolation, request-size, and webhook-egress regressions. Route tests use a fake Redis and auth service: they do not validate production database settings or provider credentials.

## Remaining production work

- Review abuse budgets and cost quotas for launch. Account and BYOK credential limits are enforced; anonymous requests are not a per-person quota.
- Review Supabase RLS policies, OAuth redirect allowlists, session settings, and actual deployment environment. These cannot be inferred from repository source.
- Add integration coverage for concurrent team edits and real authenticated user sessions. Atomic key rotation and request limits now run against disposable Redis in required CI.
- Design webhook delivery with controlled egress, destination verification, redirect restrictions, signed payloads, retries, and durable jobs before re-enabling it.
- Add retention/expiry to operational logs and remove obsolete global Redis data through an approved maintenance operation.
- Review dependency audit results, cache policy/quality tradeoffs, provider request schemas, cost estimation, and SDK behavior before a public production launch.

The account-boundary and request-limit changes are merged and Vercel reported deployment complete. Live requests without authentication return 401 for stats, key provisioning, teams, webhooks and audit; analytics ingestion returns 410. This verifies negative boundaries, not every authenticated user flow.

## Dependency review

Pinned @sentry/nextjs to 10.75.2 and patched fast-uri to 3.1.9 in the lockfile. The production dependency audit reported zero known vulnerabilities on 2026-10-25. All 58 unit/route tests, TypeScript checks, secret scanning and GitHub's production build passed. This is scoped to the checked graph and tests, not a security certification.

## Durable request limits

Proxy calls now use an atomic Redis counter and expiry. Missing, failed, or malformed limiter responses return 503 before provider calls; exhausted budgets return 429 with the remaining window in Retry-After. Verified TokenSave accounts share a budget across key rotations. Anonymous bring-your-own-key requests share a provider-credential HMAC namespace, regardless of forwarded IP headers. This is not a per-person quota: anonymous users with multiple credentials can have multiple budgets. Batch items call the same proxy limiter.

Validation includes Redis failure, malformed counters, 61 requests with changing forwarded headers, credential separation, and account key rotation. Route regressions use a fake Redis. Two additional tests now pass against an isolated real Redis service in GitHub CI: 70 simultaneous calls admit exactly 60, missing expiry is repaired, concurrent key provisioning produces one key, and rotation invalidates the old key. CI OK requires this integration job.


## Connected database review

The connected TokenSave Supabase project uses Auth and had no application tables in public or sellerbot schemas at review. Supabase's security advisor reported only disabled leaked-password protection. This feature requires an eligible paid plan; no plan upgrade was purchased. Redis data authorization remains an application responsibility.

## API contracts and code quality follow-up

- Verified accounts and anonymous BYOK requests use separate cache namespaces, even when they share a provider credential.
- Every POST route reads a byte-bounded JSON object. Shared validators reject invalid roles, message shapes, budgets, provider credentials and options before external provider calls. Unsupported generation options are rejected explicitly.
- Context operations enforce their documented character-based estimate budget and return 422 when preserved content cannot fit. This is not a tokenizer guarantee. Conversation excerpts remain untrusted user messages, never elevated system instructions.
- Batch input is fully validated before any provider call. A 45-second shared cancellation deadline bounds provider processing; each result reports success/error accurately. Provider calls share the local account limiter and reject redirects.
- Provider HTTP errors, invalid JSON, malformed completions and network failures use sanitized responses. No raw provider/auth/Redis messages are sent to clients. Account APIs and middleware use no-store responses.
- Public BYOK CORS uses `*` without cookie credentials, rather than reflecting arbitrary origins. Baseline CSP restricts embedding, base URLs, objects and form actions; it is not a complete script nonce policy.
- Provider keys are held only in page memory. Old `ts_keys_*` browser entries are purged; error-triggered session replay is disabled. Supabase session storage remains managed by its auth client.
- Team creation and edits use atomic Redis creation and compare-and-swap. Duplicate invitations and removal of the owner are rejected; stale edits return 409. Invitations remain pending records, not email delivery or a membership acceptance flow.
- Repository lint runs without exceptions for explicit any or React hook violations, and CI requires zero lint warnings. Operational Redis aggregates remain best effort and are not an invoice ledger.

Regression coverage includes malformed auth responses, provider errors and fallback, corrupt caches, byte limits, batch prevalidation, context role/budget preservation, browser credential cleanup, middleware rejection headers, and concurrent Redis team operations. Production Supabase policies/settings, provider model availability and paid invoice reconciliation remain outside these repository-only checks.
