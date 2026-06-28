# Getting started

Welcome to **AYRA Agent** — a self-hostable platform for tool-using AI agents focused on Solana, token research, and X (Twitter) workflows.

## 1. Create an account

1. Open **Sign up** at `/register`.
2. Choose a **username** (permanent — 3–30 chars, `a-z`, `0-9`, `_`).
3. Enter email and password, then confirm with the **6-digit code** sent to your inbox.
4. Sign in at `/login` with username **or** email.

> **Dev / no SMTP:** verification codes appear in server logs as `[email:dev]`.

## 2. Configure Settings (required)

After first login, open **Dashboard → Settings** and complete these steps:

| Step | Where | Required? |
|------|--------|-------------|
| **Private database** | Settings → Private Database | **Yes** — chat and brain tasks need your Postgres |
| **LLM API key** | Settings → LLM | **Yes** — OpenRouter or OpenAI-compatible key |
| **Web search (Jina)** | Settings → Web Search | Optional — better rate limits for web-search skill |
| **Telegram / X** | Settings | Optional integrations |

Detailed guides:

- [Private database](/docs/private-database)
- [Settings guide](/docs/settings)
- [Web search (Jina)](/docs/jina-web-search)

## 3. Create your first agent

1. **Dashboard → Agents → New agent** (or use a template like Ayra, Aria, Marcus).
2. Pick a model in Settings if you have not already.
3. Enable skills your workflow needs (start with a few — fewer tools = faster replies).
4. Open **Dashboard → Chat** and send a message.

## 4. Run the worker (operators)

If you self-host, the background **worker** must run alongside the web app:

```bash
npm run dev      # web (terminal 1)
npm run worker   # worker (terminal 2)
```

Production: `npm run build`, `npm run start`, and one worker via PM2 — see [Deployment](/docs/deployment).

## Architecture at a glance

AYRA uses **two** Postgres databases:

| Database | Configured in | Holds |
|----------|---------------|--------|
| **Platform** | Server `.env` → `DATABASE_URL` | Users, agents, auth, encrypted keys |
| **Private** | **Settings → Private Database** | Chat history, brain tasks |

Keep both in the **same region** as the app server. See [Private database](/docs/private-database) and [FAQ](/docs/faq).

## Next steps

- [Slash commands](/docs/slash-commands) — full command reference with examples
- [Agents & skills](/docs/agents-and-skills) — templates and tool toggles
- [Telegram bot](/docs/telegram) — connect your bot
- [Deployment](/docs/deployment) — VPS, PM2, Docker
- [FAQ & troubleshooting](/docs/faq) — slow chat, DB errors, worker issues
