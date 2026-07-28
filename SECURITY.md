# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

TokenSave is pre-1.0. Only the latest commit on `main` and the current
deployment at tokensave.vercel.app receive security fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security vulnerabilities.

Report privately through
[GitHub Security Advisories](https://github.com/Prathamg042004/tokensave/security/advisories/new)
or by email to **prathamg200404@gmail.com**, including:

- a description of the issue and its impact
- steps to reproduce
- the affected version or commit SHA

You will receive an acknowledgement within **48 hours** and a status update
within **7 days**. Please allow up to 90 days before public disclosure.

## Scope

In scope:

- the proxy and other routes under `app/api/`
- the SDK in `sdk/`
- authentication, rate limiting and cache isolation
- anything that could expose one user's prompts, responses or API keys to another user

Out of scope:

- vulnerabilities in Vercel, Supabase, Upstash or the upstream AI providers
- issues requiring physical access to a user's machine
- social engineering
- missing security headers with no demonstrated impact

## How API keys are handled

TokenSave forwards provider API keys per request and does not persist them.
If you believe a key has been logged, cached or otherwise exposed, report it
through the process above and rotate that key immediately.

## Current assurance level

Stated plainly so you can make an informed decision before sending production
traffic through the hosted proxy:

- no SOC 2 certification
- no third-party penetration test has been performed
- no formal incident response retainer
- automated checks only: gitleaks, CodeQL and Dependabot in CI

Self-hosting is supported if these constraints do not work for your use case.
This section will be updated as the project matures.
