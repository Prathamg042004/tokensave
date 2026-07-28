# Contributing to TokenSave

Thanks for taking the time to contribute. Everything is welcome, including
typo fixes and documentation improvements.

## Getting started

```bash
git clone https://github.com/Prathamg042004/tokensave.git
cd tokensave
npm install
cp .env.example .env.local   # fill in your own Supabase and Upstash values
npm run dev
```

Node 20 or newer is required.

You will need your own free-tier accounts for Supabase and Upstash Redis.
Never commit real credentials - `.env.local` is gitignored, keep it that way.

## Before opening a pull request

```bash
npm run verify   # typecheck, lint, tests, production build
```

Or run the pieces individually:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

CI runs the same commands on every pull request. Typecheck, tests (Node 20 and
22), the production build and the gitleaks secret scan are required; lint is
still advisory until the existing violations are fixed.

Tests live in `tests/` and use the built-in Node test runner, so there is no
extra tooling to install. Coverage is thin today - the SDK helpers, the pricing
table and the workflow policy. New logic is expected to ship with a test, and
anything extracted out of the API route handlers should arrive with one.

Pull request titles must follow Conventional Commits; a check enforces it.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(proxy): add OpenAI-compatible /v1/chat/completions endpoint
fix(cache): prevent cross-tenant cache key collision
docs(readme): correct the Next.js version
chore(deps): bump @upstash/redis
```

Release notes are generated from these, so the prefix matters.

## Project layout

| Path | What lives there |
| --- | --- |
| `app/api/` | API route handlers - proxy, batch, context, stats, health |
| `app/` | Marketing site, docs, playground and dashboard pages |
| `sdk/` | Client SDK |
| `middleware.ts` | Security headers, rate limiting, attack-path blocking |

Business logic is being moved out of route handlers into a `lib/` layer so it
can be unit tested. New logic should go in `lib/`, and route handlers should
only parse the request, delegate, and serialize the response.

## Adding a provider

This is the best first contribution. A provider needs:

1. an adapter that maps our internal request shape to the provider API
2. model pricing entries so cost tracking stays accurate
3. an entry in the routing table for the cheap and capable model
4. a docs update

Look for issues labelled `good first issue` and `provider`.

## Claims and numbers

Any change to a user-facing savings percentage must be backed by a benchmark
run whose results are committed to the repository. We do not ship marketing
numbers that a reader cannot reproduce from this repo.

## Code style

- TypeScript strict mode
- No `any` without a comment explaining why
- Every new API route needs an entry in the docs
- Prefer small, focused pull requests

## Reporting bugs

Use the issue templates. Include your Node version, the provider you were
calling, whether you are on the hosted proxy or self-hosted, and a minimal
reproduction with all keys redacted.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).

## License

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE).
