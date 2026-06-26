# Troubleshooting

Operational fixes for deploy, build, auth, and runtime issues.

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
| `prisma db push` wiped data | Never use `--force-reset` on production; only platform URL in `.env` |
| SSL errors | Append `?sslmode=require` to cloud Postgres URLs |

## Performance

See [FAQ — slow replies](/docs/faq) and [Best practices](/docs/best-practices).

## Still stuck?

- [FAQ](/docs/faq)
- [GitHub issues](https://github.com/ayradotrun/ayra-agent/issues)
- Support links in site footer
