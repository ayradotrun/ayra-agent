# Troubleshooting

Operational fixes for install, deploy, build, auth, and runtime issues.

## Install & database setup

### `npm run setup` fails on db push (data loss)

**Symptom:** Prisma warns about dropping `chat_message` / `chat_session` tables.

**Cause:** Older platform databases stored chat in platform Postgres. Chat now lives in each user's **private database** (Settings).

**Fix (safe — do not use `--accept-data-loss` on production without backup):**

```bash
npm run db:sync      # additive SQL patches only
npm run db:verify
npm run prisma:seed
```

Or use a **fresh empty** platform database for new installs.

### P3005 — migrate deploy failed

**Symptom:** `The database schema is not empty` during `prisma migrate deploy`.

**Fix:** Normal for existing databases. Run:

```bash
npm run setup
# or manually:
npm run db:sync
npm run db:verify
```

### Missing `.env` or DATABASE_URL

```bash
cp .env.example .env
# Edit DATABASE_URL, NEXTAUTH_SECRET, ENCRYPTION_KEY
npm run db:verify
npm run setup
```

### Python setup failed

Python is **optional** for dashboard chat; **required** for cron blueprints and some automations.

```bash
# Skip during setup:
AYRA_SKIP_PYTHON_SETUP=true npm run setup

# Install later (Python 3.9+):
npm run python:setup
```

Windows: prefer WSL2 for Python runtime — see [README — Python modules](https://github.com/ayradotrun/ayra-agent#python-modules-skills-agent-cron).

## Build fails: `react-markdown` not found

After `git pull`, run:

```bash
npm install
npm run build
```

New docs dependencies are listed in `package.json`.

## Login fails for verified users

| Symptom | Fix |
|---------|-----|
| “Email not verified” | Complete sign up with 6-digit code; check SMTP or server logs `[email:dev]` |
| Always “Invalid credentials” | Reset password at `/forgot-password`; check username spelling |
| Works locally, fails on VPS | Set `NEXTAUTH_URL` to HTTPS domain; set `NEXTAUTH_SECRET`; restart PM2 |
| Session lost immediately | Same-site cookies require HTTPS in production; clock skew rare |

Run `npm run auth:backfill` after schema updates for legacy accounts.

## Login fails for new sign ups

1. Configure SMTP in `.env` for production, or read dev codes in logs.
2. Confirm email with code before signing in.
3. Check platform DB connectivity (`DATABASE_URL`).

## Worker / Telegram

| Symptom | Fix |
|---------|-----|
| Bot silent | Start `npm run worker`; only **one** worker instance |
| Duplicate replies | Stop extra PM2 worker processes |
| Slow `/help` | Co-locate platform + private Postgres — [Private database](/docs/private-database) |

## Database

| Symptom | Fix |
|---------|-----|
| Chat empty | Connect **Settings → Private Database** |
| `prisma db push` wants data loss | Use `npm run db:sync` — see [Install & database setup](#install--database-setup) |
| `prisma db push` wiped data | Never use `--force-reset` or `--accept-data-loss` on production without backup |
| SSL errors | Append `?sslmode=require` to cloud Postgres URLs |

## Performance

See [FAQ — slow replies](/docs/faq) and [Best practices](/docs/best-practices).

## Still stuck?

- [FAQ](/docs/faq)
- [GitHub issues](https://github.com/ayradotrun/ayra-agent/issues)
- Support links in site footer
