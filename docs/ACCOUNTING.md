# Usage, cost and savings accounting

The proxy and server SDK use `sdk/accounting.js`. No provider request is made by this module.

## What the fields mean

- `usage_source: provider`: token counts were read from the response usage object. No text-length estimate or truncation is used.
- `cost_source: published_rate_estimate`: USD text-token usage multiplied by the versioned standard direct-API price table. This is not an invoice. Free tiers, credits, negotiated prices, regional premiums, taxes and failed/ambiguous requests can change the actual bill.
- `cost: null`: missing/invalid usage, an unverified model/snapshot, unsupported service tier, or unsupported billing category. `cost_unavailable_reason` explains why. Never coerce this to a free request.
- `cost_without_optimization`, `cost_saved`, `savings_percent`: null for a fresh generation. The unexecuted alternative has no measured cost. We do not infer model quality, routing savings, or compression savings from price differences.
- Cache hit: `cost: 0`, `input_tokens: 0`, `output_tokens: 0`, `cost_source: no_provider_call`. `usage` retains the original response usage as reference (`usage_source: cache_record`). `tokens_saved` is the original total tokens avoided. `cost_saved` is the original estimated cost, or null if unknown. `savings_basis: avoided_repeat_at_original_rate` is an estimate of repeating that generation at the original rate, not proof of invoice savings. A zero or unknown baseline has a null percentage.

Anthropic base input, native cache reads and cache writes are disjoint and summed for `input_tokens`. The cache write 5-minute and 1-hour rates differ. Legacy responses that report only aggregate cache creation use the default 5-minute rate. Inconsistent breakdowns, malformed detail objects and conflicting provider-reported totals produce unknown usage. OpenAI/Groq cached prompt tokens are a subset of prompt tokens. OpenAI completion totals already include reasoning; Gemini candidates and thoughts are added once.

## Verified prices

Snapshot date/version: **2026-10-30**, USD per million text tokens, standard synchronous direct API.

| Provider/model                  | Input | Output | Native cache read | 5m write | 1h write |
| ------------------------------- | ----: | -----: | ----------------: | -------: | -------: |
| OpenAI GPT-4o / 2024-08-06      |  2.50 |  10.00 |              1.25 |        — |        — |
| OpenAI GPT-4o mini / 2024-07-18 |  0.15 |   0.60 |             0.075 |        — |        — |
| Claude Haiku 4.5 / 20251001     |  1.00 |   5.00 |              0.10 |     1.25 |     2.00 |
| Claude Sonnet 4.6               |  3.00 |  15.00 |              0.30 |     3.75 |     6.00 |

Sources checked:

- https://developers.openai.com/api/docs/models/gpt-4o
- https://developers.openai.com/api/docs/models/gpt-4o-mini
- https://platform.claude.com/docs/en/about-claude/pricing
- Usage contracts: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create and https://ai.google.dev/api/generate-content

The current Google pricing page no longer lists the routed Gemini 2.0 models. Groq lists the routed Llama models as enterprise/contact-sales. Their usage is reported, but cost remains null. Other explicit models also return null until a provider-scoped, source-verified price entry is added. Do not alias an unknown response snapshot to a different model's price.

These model defaults are legacy and availability is independently determined by each provider. This change does not migrate model selection.

## Aggregation and migration

New counters live under `billing:v1:stats:*` and `billing:v1:user_stats:*`. Old character-derived costs and fixed cache savings are intentionally excluded. Cache keys also use a new prefix, so pre-migration records cannot supply invented savings. Old Redis keys are left untouched.

Costs accumulate as integer nano-USD (1e-9 dollars), avoiding per-request rounding to whole micro-dollars that discarded small charges. API totals convert back to USD. Known-cost totals are partial; `unknown_cost_requests` counts requests with unavailable cost. New request logs also use `billing:v1:request_logs:*`, so the dashboard does not mix legacy savings records with the new accounting version. Logging is best effort, not a financial ledger: Redis write failures can leave incomplete aggregates. Reconcile with provider invoices before billing customers. Token avoidance counters use available usage only.

Prompt text is preserved rather than destructively compressed. No claim of measured compression savings is made.

## Verification

`npm test` covers full-length output, native cache read/write categories, missing and invalid usage, zero denominators, unknown prices, fallback accounting, cache accounting, and successful proxy-to-cache round trips with mocked provider HTTP responses. A loopback HTTP integration test additionally exercises actual fetch transport, cache savings, fallback and cancellation while consuming a response body. These tests spend no provider credits. Real-provider invoice reconciliation remains a separate acceptance check.
