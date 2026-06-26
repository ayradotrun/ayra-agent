# Integrations overview

AYRA connects to external services through **Dashboard → Settings** and per-agent toggles. Each integration stores credentials encrypted on the platform database.

## Core integrations

| Integration | Settings | Docs |
|-------------|----------|------|
| **Private Postgres** | Private Database | [Private database](/docs/private-database) |
| **LLM (OpenRouter, etc.)** | LLM | [Settings guide](/docs/settings) |
| **Web search (Jina BYOK)** | Web Search (Jina) | [Web search](/docs/jina-web-search) |
| **Telegram bot** | Telegram | [Telegram bot](/docs/telegram) |
| **X (Twitter)** | X OAuth or manual keys | [X manual keys](/docs/x-manual-keys) |
| **Solana RPC** | Solana RPC | [Settings guide](/docs/settings) |
| **AgentMemory** | AgentMemory | [Settings guide](/docs/settings) |

## How integrations run

1. **Dashboard chat** — slash commands and agent tool calls use your keys from Settings.
2. **Telegram** — worker polls or receives webhooks; uses the same agent + skills as chat.
3. **Brain / cron** — scheduled tasks stored in your **private database**; worker executes on schedule.

## Security

- Keys never appear in client-side JavaScript after save.
- Use separate API keys per environment (dev vs production).
- Rotate keys immediately if leaked.

## Next steps

- [Getting started](/docs/getting-started)
- [Agents & skills](/docs/agents-and-skills)
- [API reference](/docs/api-reference)
