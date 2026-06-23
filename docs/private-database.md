# Private database setup (required)

Every AYRA account must connect **your own PostgreSQL** for dashboard chat and AYRA Brain tasks. No Prisma, migrations, or CLI required on your side.

## Before you start

- You need an AYRA Agent account on a deployed or self-hosted instance
- Create a **new empty** Postgres database (do not share with unrelated apps unless you trust table names `chat_*` and `brain_task`)
- Use a connection string with **read/write** access

## Supabase

1. Sign in at [supabase.com](https://supabase.com) → **New project**
2. Choose region close to your AYRA server; set a strong database password
3. Wait until the project is ready
4. Go to **Project Settings → Database**
5. Under **Connection string**, select **URI**
6. Copy the string (mode **Session** or **Direct** on port `5432` is recommended for DDL on first connect)
7. Replace `[YOUR-PASSWORD]` with your database password
8. In AYRA: **Dashboard → Settings → Private Database (AYRA)** → paste → **Save**

Example shape:

```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

## Neon

1. Sign in at [neon.tech](https://neon.tech) → **Create project**
2. Open the project → **Dashboard → Connection details**
3. Copy the **PostgreSQL connection string**
4. Paste into AYRA Settings → **Save**

## Railway / Render / other

1. Add a **PostgreSQL** service to your project
2. Copy the **`DATABASE_URL`** or **Postgres connection URL** from the provider dashboard
3. Paste into AYRA Settings → **Save**

## What happens when you save

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
| self-signed certificate / certificate chain | Cloud Postgres (Supabase, Neon) is supported — save again after updating AYRA; or add `?sslmode=no-verify` to the URL |
| Invalid URL | Must start with `postgresql://` or `postgres://` |
| Empty after migrate | Re-save URL once, or start a new chat after connecting |

## Security notes

- Treat the connection string like a password — anyone with it can read your chat/brain data
- Prefer a dedicated database or project per user
- AYRA encrypts the URL at rest; rotation = paste a new URL and save

For platform security and vulnerability reporting, see [SECURITY.md](../SECURITY.md).
