# Best practices

Recommendations for secure, fast AYRA deployments.

## Security

- Set strong `NEXTAUTH_SECRET` and `ENCRYPTION_KEY` (32+ bytes).
- Use HTTPS in production; match `NEXTAUTH_URL` exactly.
- Restrict Postgres to localhost or private network on VPS.
- Set `ADMIN_EMAILS` only for trusted operators.
- Never commit `.env` or user private database URLs.

See [Security](/security).

## Database region sync

Platform DB (`.env`) and private DB (Settings) must be in the **same region** as the app server. Self-host on one VPS with two database names is ideal — [Private database](/docs/private-database).

## Performance

- Use a fast LLM default (`google/gemma-4-31b-it:free` on OpenRouter free tier).
- Disable unused agent skills (each adds tools the model may call).
- Keep fallback model chains short (2–3 models).
- Optional AgentMemory: run sidecar or disable if server is down.

## Operations

- **One worker** per deployment (PM2 `ayra-agent-worker`).
- Monitor logs: `pm2 logs ayra-agent-worker`.
- After deploy: `git pull && npm install && npm run build && pm2 restart all`.
- Back up platform Postgres regularly; users back up their own private DB.

## User onboarding

1. Private database first (required for chat).
2. LLM key second.
3. Optional: Jina, Telegram, X.
4. Enable skills gradually.

## Documentation

- Operators: [Deployment](/docs/deployment)
- Users: [Getting started](/docs/getting-started)
- Resources: [API reference](/docs/api-reference), [Examples](/docs/examples)
