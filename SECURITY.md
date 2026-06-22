# Security Policy

We take the security of AYRA Agent and our users' data seriously. This document explains how to report vulnerabilities and how we handle sensitive information.

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

Security fixes are applied to the latest release on the default branch.

## Reporting a vulnerability

**Please do not open public GitHub issues for security vulnerabilities.**

Instead, report privately by email or through your organization's security channel. Include:

1. A clear description of the issue and potential impact
2. Steps to reproduce (proof of concept if available)
3. Affected component (API route, worker, settings, Telegram webhook, etc.)
4. Your environment (self-hosted / version / relevant config — **no secrets**)

We aim to acknowledge reports within **72 hours** and provide a status update within **7 days**.

## What we protect

- **Credentials at rest** — API keys, Telegram tokens, X OAuth tokens, RPC keys, and private database URLs are encrypted with AES-256-GCM when `ENCRYPTION_KEY` is set.
- **Session security** — NextAuth sessions; production requires a strong `NEXTAUTH_SECRET`.
- **Tenant isolation** — Dashboard APIs scope data by authenticated `userId`. Chat and brain data for users with a private database URL are stored in their own Postgres instance.
- **Rate limiting** — API routes and chat endpoints enforce per-user / per-IP limits.
- **Agent safety** — Run timeouts, max tool calls per run, explicit skill permissions, no shell execution by default.

## Operator responsibilities (self-hosted)

If you deploy AYRA Agent, you are responsible for:

| Item | Recommendation |
|------|------------------|
| `ENCRYPTION_KEY` | 32+ random bytes; never commit to git |
| `NEXTAUTH_SECRET` | Unique per deployment |
| `DATABASE_URL` | Restrict network access; use TLS |
| Worker | Run a **single** worker instance to avoid duplicate Telegram replies |
| `.env` | Never commit; rotate keys if leaked |
| Private user DBs | Users supply their own Postgres; you do not hold their chat/brain data when BYOD is enabled |

## Out of scope

- Misconfiguration of third-party services (Supabase, OpenRouter, X API, Telegram)
- Social engineering or phishing against end users
- Issues in dependencies without a practical exploit path in AYRA Agent
- Users sharing API keys or database URLs in public channels

## Disclosure

We follow coordinated disclosure. We will credit reporters who wish to be acknowledged after a fix is available, unless you prefer to remain anonymous.

## Security-related configuration

See [README.md](./README.md#security) and [.env.example](./.env.example) for encryption, auth, and deployment hardening guidance.
