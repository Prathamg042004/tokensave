# TokenSave

AI API cost optimization middleware. Reduces Claude, GPT, Gemini, and Groq bills by up to 40% through automatic caching, smart model routing, and prompt compression.

**Live:** [tokensave.vercel.app](https://tokensave.vercel.app)

## How it works
## Quick start

Replace your AI provider URL:

```js
// Before
fetch("https://api.anthropic.com/v1/messages", opts)

// After
fetch("https://tokensave.vercel.app/api/proxy", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    provider: "anthropic",
    apiKey: "your-key",
    messages: [{ role: "user", content: "Hello" }]
  })
})
```

## Providers

| Provider | Simple model | Complex model | Savings |
|----------|-------------|---------------|---------|
| Anthropic | claude-haiku-4-5 | claude-sonnet-4-6 | Up to 66% |
| OpenAI | gpt-4o-mini | gpt-4o | Up to 94% |
| Google | gemini-2.0-flash-lite | gemini-2.0-flash | Up to 50% |
| Groq | llama-3.1-8b | llama-3.3-70b | Free |

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/proxy | Main optimization proxy |
| POST | /api/batch | Process up to 50 prompts |
| POST | /api/smart-context | Summarize long conversations |
| POST | /api/trim-context | Trim old messages |
| GET | /api/stats | Usage analytics |
| GET | /api/health | Service health checks |
| POST | /api/generate-key | Generate/rotate API key |
| POST | /api/webhooks | Manage webhook notifications |
| POST | /api/teams | Team management |
| GET | /api/audit | Security audit log |

## Tech stack

- **Framework:** Next.js 15 (App Router)
- **Auth:** Supabase (email, GitHub, Google OAuth)
- **Cache:** Upstash Redis
- **Hosting:** Vercel
- **Language:** TypeScript

## Project structure
## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

## License

MIT

## Author

Pratham Gupta — [prathamg200404@gmail.com](mailto:prathamg200404@gmail.com)