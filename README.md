<div align="center">

# TokenSave

**Cut your LLM API bill with caching, cost-aware model routing and context compression.**

A drop-in middleware for Claude, GPT, Gemini and Groq. Measured in dollars, not bytes.

[![CI](https://github.com/Prathamg042004/tokensave/actions/workflows/ci.yml/badge.svg)](https://github.com/Prathamg042004/tokensave/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Stars](https://img.shields.io/github/stars/Prathamg042004/tokensave?style=flat)](https://github.com/Prathamg042004/tokensave/stargazers)

[Live app](https://tokensave.vercel.app) ·
[Playground](https://tokensave.vercel.app/playground) ·
[Docs](https://tokensave.vercel.app/docs) ·
[Security](https://tokensave.vercel.app/security) ·
[Changelog](./CHANGELOG.md)

</div>

---

## Why

Most tools in this space report how many **characters** they stripped out of a
payload. TokenSave is built around the number that actually appears on your
invoice: **dollars saved**. Four independent layers stack up:

| Layer | Effect | Mechanism |
| --- | --- | --- |
| Semantic cache | 100% saving on a cache hit | The request never reaches the provider |
| Cost-aware routing | Up to 66% cheaper per request | Simple prompts to a cheap model, complex prompts to a capable one |
| Context summarisation | Large reduction on long chats | Old turns summarised, recent turns kept verbatim |
| Prompt compression | Small reduction on every request | Filler phrases and redundant whitespace removed |

> **On the numbers.** The percentages above and on the marketing site come from
> internal measurement, not from a public, reproducible benchmark. A benchmark
> harness using a real tokenizer rather than character counting is the top item
> on the roadmap below. Until it lands, treat the figures as indicative.

## Quick start

TokenSave currently exposes its own JSON API. Send your prompt, your provider,
and your provider key:

```js
const res = await fetch("https://tokensave.vercel.app/api/proxy", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    provider: "anthropic",
    apiKey: process.env.ANTHROPIC_API_KEY,
    tsKey: process.env.TOKENSAVE_KEY,
    messages: [{ role: "user", content: "Explain CRDTs" }],
  }),
});

const data = await res.json();
console.log(data.tokensave_meta);
// { cache_hit: false, model_used: "claude-haiku-4-5", complexity: "simple", ... }
```

Python and cURL examples are in the [docs](https://tokensave.vercel.app/docs).

> **Heads up:** this is not yet a true drop-in replacement. The official
> `openai` and `anthropic` SDKs, LangChain and the Vercel AI SDK will not work
> against `/api/proxy` because the request body shape differs from the provider
> APIs. OpenAI- and Anthropic-compatible endpoints are on the roadmap.

## How it works

```
your app ──▶ TokenSave ──┬─▶ cache hit?        → return immediately, $0
                         ├─▶ classify prompt   → cheap model or capable model
                         ├─▶ compress          → trim filler + summarise old turns
                         ├─▶ call provider     → forward, return, record cost
                         └─▶ rate limited?     → fail over to a backup provider
```

## Providers

| Provider | Simple prompts | Complex prompts |
| --- | --- | --- |
| Anthropic | `claude-haiku-4-5` | `claude-sonnet-4` |
| OpenAI | `gpt-4o-mini` | `gpt-4o` |
| Google | `gemini-2.0-flash-lite` | `gemini-2.0-flash` |
| Groq | `llama-3.1-8b-instant` | `llama-3.3-70b-versatile` |

## API

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/proxy` | Main optimisation proxy |
| POST | `/api/batch` | Up to 50 prompts in one request |
| POST | `/api/smart-context` | Summarise long conversations |
| POST | `/api/trim-context` | Drop oldest messages to fit a token budget |
| GET | `/api/stats` | Usage and savings analytics |
| GET | `/api/analytics` | Cost, latency and error-rate metrics |
| GET | `/api/health` | Health check |
| POST | `/api/generate-key` | Create or rotate a TokenSave key |
| POST | `/api/webhooks` | Manage webhook notifications |
| POST | `/api/teams` | Team management |
| GET | `/api/audit` | Security audit log |

## Running it yourself

```bash
git clone https://github.com/Prathamg042004/tokensave.git
cd tokensave
npm install
cp .env.example .env.local   # add your own Supabase and Upstash values
npm run dev
```

Node 20+ required. You will need free-tier accounts for
[Supabase](https://supabase.com) for auth and [Upstash](https://upstash.com) for Redis.

## Tech stack

- **Framework** Next.js 16 (App Router), React 19, TypeScript
- **Auth** Supabase (email, GitHub and Google OAuth)
- **Cache and rate limiting** Upstash Redis
- **Monitoring** Sentry
- **Hosting** Vercel

## Project status

TokenSave is pre-1.0 and maintained by one person. Being upfront about it:

| Area | Status |
| --- | --- |
| Typecheck in CI | Passing |
| Secret scanning (gitleaks) in CI | Passing |
| CodeQL static analysis in CI | Passing |
| ESLint | Advisory, existing violations tracked in an open issue |
| Automated tests | Not yet, highest-priority gap |
| SDK on npm | Not yet, `sdk/` is source only |
| Docker image and self-host guide | Not yet |
| Streaming and tool calling | Not supported yet |
| SOC 2 or third-party pen test | No |

If any of these are blockers for you, open an issue. It helps prioritise.

## Roadmap

1. **Reproducible benchmark** with a public dataset, a real tokenizer and committed results
2. **Drop-in compatibility** via OpenAI `/v1/chat/completions` and Anthropic `/v1/messages`
3. **Streaming (SSE) and tool-calling passthrough**
4. **Quality suite** covering routing accuracy, cache false-hit rate and compression fidelity
5. **Tests and a `lib/` layer** extracted out of the API route handlers
6. **Publish the SDK** to npm and PyPI, plus a Docker image and self-hosting guide
7. **More providers** including Bedrock, Vertex, Azure OpenAI, OpenRouter, Mistral, DeepSeek and local models
8. **Native prompt caching** with automatic `cache_control` placement on top of provider caching

## Contributing

Contributions are welcome, including typo fixes. Start with
[CONTRIBUTING.md](./CONTRIBUTING.md). Adding a provider is a good first task.

## Security

Report vulnerabilities privately, see [SECURITY.md](./SECURITY.md). Please do
not open a public issue for security problems.

## License

[MIT](./LICENSE) © Pratham Gupta
