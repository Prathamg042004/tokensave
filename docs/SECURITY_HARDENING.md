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

- Durable rate limiting must fail closed during Redis outages, with quotas appropriate to authenticated tenants and hosted deployment headers.
- Review Supabase RLS policies, OAuth redirect allowlists, session settings, and actual deployment environment. These cannot be inferred from repository source.
- Add integration coverage against a disposable Redis for Lua key rotation, concurrent team edits, and real auth sessions.
- Design webhook delivery with controlled egress, destination verification, redirect restrictions, signed payloads, retries, and durable jobs before re-enabling it.
- Add retention/expiry to operational logs and remove obsolete global Redis data through an approved maintenance operation.
- Review dependency audit results, cache policy/quality tradeoffs, provider request schemas, cost estimation, and SDK behavior before a public production launch.

The source changes must be merged and deployed before they protect the hosted service.

## Dependency review

Pinned @sentry/nextjs to 10.75.2 to address GHSA-mchm-gjx6-7h55 and updated the lockfile. After this update, `npm audit --omit=dev` reported zero known runtime dependency vulnerabilities on 2026-10-23. This is scoped to the checked dependency graph, not a guarantee that the application is secure. TypeScript checking and all 55 tests passed after the update. The production build remains unverified because approval review blocked Sentry build-time transmission.
