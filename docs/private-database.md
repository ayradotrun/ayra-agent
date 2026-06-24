# Private database setup (required)

Every AYRA account must connect **your own PostgreSQL** for dashboard chat and AYRA Brain tasks. No Prisma, migrations, or CLI required on your side.

## Region sync (platform `.env` + Settings)

AYRA reads from **two** databases on many requests:

| | Where | Example |
|---|--------|---------|
| **Platform** | Server `.env` (`DATABASE_URL`) | Users, agents, auth |
| **Private** | **Settings → Private Database** | Chat, brain tasks |

Keep both in the **same region** as the AYRA app server. If the operator hosts the app in **Germany (eu-central-1)**, both URLs should target **Germany** — not Singapore, US East, etc. Cross-region pairs add latency on every chat message and Telegram reply.

| Recommended setup | Platform (`.env`) | Private (Settings) |
|-------------------|-------------------|---------------------|
| VPS self-host | `127.0.0.1:5432/ayra` | `127.0.0.1:5432/nami` |
| Solo self-host (one DB) | `DATABASE_URL` in `.env` | Same `DIRECT_DATABASE_URL` + `AYRA_ALLOW_PLATFORM_BRAIN_DB=true` |
| Cloud | Supabase/Neon **eu-central-1** | Second project/DB also **eu-central-1** |

**Recommended:** host the database in Germany (`eu-central-1`) when the AYRA server runs in EU — other regions still work but feel slower, especially when platform and private regions differ.

## Before you start

- You need an AYRA Agent account on a deployed or self-hosted instance
- Create a **new empty** Postgres database (do not share with unrelated apps unless you trust table names `chat_*` and `brain_task`)
- Use a connection string with **read/write** access
- **Same region as platform DB:** match the region in server `DATABASE_URL` (see [Region sync](#region-sync-platform-env--settings) above)

## Solo self-host (same Postgres as platform)

If you are the **only user** on your instance, you may store chat/brain tables on the **same Supabase/Postgres** as the platform:

1. Set in server `.env`:
   ```bash
   AYRA_ALLOW_PLATFORM_BRAIN_DB=true
   ```
   (Enabled by default in `NODE_ENV=development`.)

2. **Dashboard → Settings → Private Database** → paste either:
   - `DATABASE_URL` (pooler, port 6543), or
   - `DIRECT_DATABASE_URL` (session, port 5432 — recommended)

3. Click **Connect**. If you paste the pooler URL, AYRA auto-switches to `DIRECT_DATABASE_URL` for creating tables.

Tables `chat_session`, `chat_message`, and `brain_task` live alongside platform Prisma tables in the same database.

## Supabase

1. Sign in at [supabase.com](https://supabase.com) → **New project**
2. We recommend region **Europe (Frankfurt) / eu-central-1** for lower latency; set a strong database password
3. Wait until the project is ready
4. Go to **Project Settings → Database**
5. Under **Connection string**, select **URI**
6. Copy the string (mode **Session** or **Direct** on port `5432` is recommended for DDL on first connect)
7. Replace `[YOUR-PASSWORD]` with your database password
8. In AYRA: **Dashboard → Settings → Private Database (AYRA)** → paste → **Connect**

Example shape:

```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

## Neon

1. Sign in at [neon.tech](https://neon.tech) → **Create project**
2. Open the project → **Dashboard → Connection details**
3. Copy the **PostgreSQL connection string**
4. Paste into AYRA Settings → **Connect**

## Railway / Render / other

1. Add a **PostgreSQL** service to your project
2. Copy the **`DATABASE_URL`** or **Postgres connection URL** from the provider dashboard
3. Paste into AYRA Settings → **Connect**

## What happens when you connect

| Step | Action |
|------|--------|
| 1 | AYRA tests the connection |
| 2 | Tables are created if missing (`chat_session`, `chat_message`, `brain_task`) |
| 3 | Existing platform chat and local brain data are copied once |
| 4 | Your URL is encrypted and stored on your user record |

## Tables created

| Table | Purpose |
|-------|---------|
| `chat_session` | Chat threads (title, pin, model, agent link) |
| `chat_message` | Messages per session |
| `brain_task` | Scheduled tweets, reminders, calendar tasks |

`user_id` and `agent_id` values reference your AYRA account and agents on the platform database (stored as text, no cross-database foreign keys).

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Connection failed | Check password, IP allowlist, SSL; try appending `?sslmode=require` to the URL |
| self-signed certificate / certificate chain | Cloud Postgres (Supabase, Neon) is supported — click Connect again after updating AYRA; or add `?sslmode=no-verify` to the URL |
| Invalid URL | Must start with `postgresql://` or `postgres://` |
| Platform database rejected | Set `AYRA_ALLOW_PLATFORM_BRAIN_DB=true` for solo self-host, or use a separate Postgres project |
| Empty after migrate | Connect again once, or start a new chat after connecting |
| Slow chat / Telegram | Platform DB (`.env`) and private DB (Settings) in different regions — use the same region as the app server for both |

- Treat the connection string like a password — anyone with it can read your chat/brain data
- Prefer a dedicated database or project per user
- AYRA encrypts the URL at rest; rotation = paste a new URL and click Connect

For platform security and vulnerability reporting, see [SECURITY.md](../SECURITY.md).
