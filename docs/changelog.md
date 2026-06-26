# Changelog

Recent user-facing changes. For full git history see [GitHub commits](https://github.com/ayradotrun/ayra-agent/commits/main).

## 2026-06 (latest)

### Documentation
- Full **/docs** site with guides, Resources hub, and mobile bottom navigation
- Resources: API reference, examples, templates, changelog, troubleshooting, FAQ

### Auth
- Email verification on sign up; username or email login
- Clear login errors for unverified email (`EmailNotVerified`)
- Password reset via `/forgot-password`

### Web search
- Jina BYOK per user in Settings (no platform server key)
- Fallback: anonymous Jina → Bing → DuckDuckGo

### Mobile
- Dashboard bottom navigation (no hamburger menu)
- Public pages use bottom nav: Home, Docs, Resources, Sign in, Sign up

### Ops
- Region sync guidance for platform + private Postgres
- Telegram reliability and English command messages

## Upgrade notes

After pulling latest code on VPS:

```bash
git pull
npm install
npm run setup
npm run build
pm2 restart all
```

If auth schema changed: `npx prisma db push` then `npm run auth:backfill` for legacy users.

See [Deployment](/docs/deployment) and [Troubleshooting](/docs/troubleshooting).
