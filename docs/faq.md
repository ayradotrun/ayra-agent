# FAQ & troubleshooting

Common questions for AYRA users and operators.

## Slow replies

**Check in order:**

1. **Database regions** — platform (`.env`) and private (Settings) must match the app server region. See [Private database](/docs/private-database).
2. **Model size** — large free models are slow; try `google/gemma-4-31b-it:free` in Settings → LLM.
3. **Too many skills** — disable unused skills on the agent.
4. **AgentMemory** — if enabled but server is down, disable or start `npm run agentmemory`.
5. **Deep thinking** — dashboard toggle uses longer timeouts (30–120s).

Environment tuning (operator `.env`):

| Variable | Default | Effect |
|----------|---------|--------|
| `LLM_REQUEST_TIMEOUT_MS` | `45000` | Max wait per LLM call |
| `LLM_MAX_TOKENS` | `1536` | Shorter = faster |
| `MAX_TOOL_CALLS_PER_RUN` | `6` | Cap tool rounds |
| `CHAT_HISTORY_TURNS` | `8` | Less context = faster |

## Private database errors

| Error / symptom | Fix |
|-----------------|-----|
| Chat empty / "connect database" | Paste URL in **Settings → Private Database** → Save |
| Connection refused | Check host, port, firewall; Postgres must accept connections |
| SSL required | Add `?sslmode=require` to URL (Supabase/Neon) |
| Wrong database wiped | `prisma db push` only affects platform DB in `.env` — never point `.env` at user's private DB name by mistake |

Tables created automatically: `chat_session`, `chat_message`, `brain_task`.

## Web search not working

- Enable **web-search** skill on the agent
- Optional Jina key: [Web search guide](/docs/jina-web-search)
- Without a key, search uses anonymous Jina → Bing → DuckDuckGo
- VPS must allow outbound HTTPS to search providers

## Telegram duplicate or missing messages

| Symptom | Fix |
|---------|-----|
| Duplicate replies | Stop extra workers — **one** PM2 worker only |
| No replies | Start `npm run worker`; verify bot token and chat ID in Settings |
| Slow `/help` | Database region mismatch — co-locate platform + private DB |

## Email verification

| Environment | Behavior |
|-------------|----------|
| **Production** | Configure SMTP in `.env` (Resend recommended) |
| **Development** | Codes logged as `[email:dev]` |
| **Legacy users** | Operator runs `npm run auth:backfill` after schema update |

## Worker / brain tasks not running

```bash
npm run worker
# or
pm2 logs ayra-agent-worker
```

Brain tasks live in the user's **private** Postgres. Python runtime starts automatically for cron blueprints.

## Authentication

- Sign in with **username or email**
- Username cannot change after registration
- Password reset: `/forgot-password` with email code

## Admin access

Set `ADMIN_EMAILS=you@domain.com` in server `.env`, re-login — **Admin** appears in the sidebar.

## Still stuck?

- [Documentation hub](/docs)
- [GitHub issues](https://github.com/ayradotrun/ayra-agent/issues)
- Support links on the homepage footer
