# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### API correctness, security and code quality

- Add shared bounded request validation, truthful batch statuses and deadlines, and strict estimated context budgets with explicit 422 responses.
- Sanitize upstream errors, preserve cancellation, prevent summary privilege promotion, and strengthen private-response headers.
- Protect team creation/edits against concurrent writes, validate pending invitations and prevent owner removal.
- Remove provider credentials from persistent browser storage, clear legacy entries and disable error session replay.
- Replace explicit any with typed boundaries, fix React hook/prop issues, and make repository-wide zero-warning lint mandatory in CI.

### SDK accounting follow-up

- Isolate returned accounting metadata from cached records, including nested usage.
- Use credential-keyed HMAC cache scopes with a random per-instance salt.
- Reject malformed response parts and inconsistent usage totals; treat corrupt cached records as misses.
- Preserve cancellation errors during response-body reads and exercise real loopback HTTP transport without provider credits.

### SDK reliability and accounting

- Server SDK: typed/sanitized failures, full provider fallback adapters, bounded timeouts and cancellation, credential/model/output-limit isolated SHA-256 cache, success-only caching, bounded retention, and cloned cache returns.
- Shared provider-usage accounting: full output counts, native cache categories, versioned public prices, null for unknown prices/usage, and avoided-repeat cache savings instead of fixed or hypothetical numbers.
- Verbatim prompt preservation; accurate API/playground displays; integer nano-USD aggregates in a new namespace that excludes old estimates.
- SDK migration guide, accounting sources and regression tests. No SDK analytics transmission.


### Added

- MIT `LICENSE` file, `SECURITY.md`, `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`
- Issue templates, template chooser config and pull request template
- CI workflow: typecheck, lint, gitleaks secret scan and CodeQL
- Dependabot for npm and GitHub Actions
- `.env.example` documenting every required environment variable

### Planned

- OpenAI-compatible `/v1/chat/completions` and Anthropic-compatible `/v1/messages` endpoints
- Streaming (SSE) and tool-calling passthrough
- Reproducible savings benchmark with a real tokenizer instead of character estimates
- Published quality suite: routing accuracy, cache false-hit rate, compression fidelity
- Test suite and a `lib/` layer extracted from the API route handlers
- SDK published to npm, Docker image and self-hosting guide

## [3.1.0] - 2026-07

### Added

- Rate limiting with standard `X-RateLimit-*` headers (60 req/min)
- Input validation and sanitisation on all endpoints
- Security headers middleware (HSTS, CSP, XSS protection)
- Health check endpoint at `/api/health`
- Audit logging with hashed IP addresses
- Error boundary for graceful crash handling
- Sentry error monitoring
- Uptime monitoring

## [3.0.0] - 2026-07

### Added

- Per-token cost tracking on every request
- Latency monitoring with average and p95 metrics
- Error rate tracking
- Per-user analytics and usage tracking
- Custom tags on requests for filtering
- Webhook notifications
- Team management with roles
- API key rotation
- Quality modes: `auto`, `max_savings`, `max_quality`
- Multi-provider automatic fallback on rate limits

## [2.0.0] - 2026-07

### Added

- Smart context summarisation for long conversations
- Complexity detection with code awareness
- Prompt compression that preserves meaning
- Custom model routing rules in the dashboard
- Request history with search and filters
- Budget alerts
- API reference examples in 8 languages

## [1.3.0] - 2026-07

### Added

- Batch API for up to 50 prompts per request
- Context window manager with automatic trimming
- TokenSave API key generation per user

## [1.2.0] - 2026-07

### Added

- Playground chat mode with multi-turn optimisation
- Side-by-side provider comparison
- Cost calculator
- Prompt templates
- File upload for TXT, CSV and JSON
- Response export
- Groq (Llama) provider

## [1.1.0] - 2026-06

### Added

- SDK for running optimisation locally
- Security and trust page
- Rate limiting at 60 req/min
- API docs with cURL, JavaScript and Python examples
- Demo mode in the playground

## [1.0.0] - 2026-06

### Added

- Semantic caching
- Model routing
- Prompt compression
- Anthropic, OpenAI, Google and Groq support
- Dashboard with 7-day usage chart
- GitHub OAuth and email authentication
