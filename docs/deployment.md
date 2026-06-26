# Deployment (VPS / PM2)

Guide for operators self-hosting AYRA on a VPS (e.g. Contabo EU) or cloud VM.

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | 18.18+ (20 LTS recommended) |
| **Python** | 3.9+ — `npm run python:setup` |
| **PostgreSQL** | Platform DB in `.env`; users add private DB in Settings |
| **Domain + HTTPS** | Required for production `NEXTAUTH_URL` |

## Minimum `.env` (platform)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Platform Postgres (pooler OK for Supabase) |
| `DIRECT_DATABASE_URL` | Direct URL for Prisma |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Public HTTPS URL |
| `ENCRYPTION_KEY` | 32+ chars — encrypts user secrets |

Optional: SMTP for email verification, `OPENROUTER_API_KEY` as global LLM fallback, Telegram/X OAuth vars — see `.env.example`.

## Install and build

```bash
git clone https://github.com/ayradotrun/ayra-agent.git
cd ayra-agent
cp .env.example .env
# edit .env

npm install
npm run setup
npm run build
```

## Run with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Typical processes:

| Process | Role |
|---------|------|
| `ayra-agent-web` | Next.js (`npm run start`) |
| `ayra-agent-worker` | Scheduler, Telegram, brain tasks |
| `ayra-agent-memory` | Optional AgentMemory sidecar |

Run **only one worker** per deployment.

## Local Postgres on one VPS (recommended)

```bash
# Platform only — e.g. database name platform_db
DATABASE_URL=postgresql://postgres:PASSWORD@127.0.0.1:5432/platform_db
DIRECT_DATABASE_URL=postgresql://postgres:PASSWORD@127.0.0.1:5432/platform_db
```

Users paste private URL in Settings, e.g. `postgresql://postgres:PASSWORD@127.0.0.1:5432/private_db` — same host, zero cross-region latency.

> **Never** run `prisma db push --force-reset` against production. It wipes the platform DB in `.env`.

## Region sync

Platform DB (`.env`) and each user's private DB (Settings) should be in the **same region** as the app server. Cross-region pairs add latency on every chat message.

Details: [Private database — region sync](/docs/private-database#region-sync-platform-env--settings).

## Telegram in production

- Keep one worker running
- Prefer webhook with HTTPS when `TELEGRAM_POLLING=false`
- Set bot token only in user Settings (encrypted) — operator may provide a default in `.env` for testing

## Docker

```bash
cp .env.example .env
docker compose up --build
```

See `docker-compose.yml` for split `app` / `worker` / `db` services.

## Updates

```bash
git pull
npm install
npm run setup    # if schema/skills changed
npm run build
pm2 restart all
```

After auth schema changes: `npx prisma db push` then `npm run auth:backfill`.

## Security checklist

- Strong `NEXTAUTH_SECRET` and `ENCRYPTION_KEY`
- HTTPS only in production
- Restrict Postgres to localhost or private network
- Set `ADMIN_EMAILS` for admin dashboard access
- Review [Security](/security) page

## Related

- [Getting started](/docs/getting-started)
- [FAQ](/docs/faq)
- [Private database](/docs/private-database)
