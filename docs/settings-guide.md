# Settings guide

**Dashboard → Settings** is where you configure API keys, integrations, and your private database. All secrets are encrypted at rest on the platform database.

## Private database (required)

Paste your Postgres connection URL under **Private Database (AYRA)**. AYRA tests the connection, creates tables automatically, and stores the URL encrypted.

Full walkthrough: [Private database](/docs/private-database).

**Region:** use the same region as the operator's platform DB and app server (e.g. `eu-central-1` / Germany on a EU VPS).

## LLM

| Field | Purpose |
|-------|---------|
| **API key** | OpenRouter (recommended), OpenAI, or any OpenAI-compatible provider |
| **Model** | Primary model — default `google/gemma-4-31b-it:free` is fast on OpenRouter free tier |
| **Fallback models** | Comma-separated list tried on 429/402 errors — keep the chain short (2–3) |

> **ChatGPT Plus / Claude Pro ≠ API.** You need a developer API key or OpenRouter.

Tune timeouts and token limits via server `.env` — see [FAQ](/docs/faq#slow-replies).

## Web search (Jina) — optional BYOK

Each user can add a free [Jina API key](https://jina.ai/?sui=apikey) for higher rate limits on the **web-search** skill. AYRA does **not** use a platform server key for your searches.

Guide: [Web search (Jina)](/docs/jina-web-search).

## Telegram

| Field | Purpose |
|-------|---------|
| **Bot token** | From [@BotFather](https://t.me/BotFather) |
| **Chat ID** | Your Telegram user or group ID for notifications |

See [Telegram bot](/docs/telegram) for setup and slash commands.

## X (Twitter)

- **OAuth** — connect via the dashboard when enabled by the operator
- **Manual keys** — advanced posting with your own API credentials ([x-manual-keys on GitHub](https://github.com/ayradotrun/ayra-agent/blob/main/docs/x-manual-keys.md))

Auto-post requires explicit opt-in on the agent.

## Solana RPC

Optional custom RPC URL and API key for on-chain skills (wallet watch, token research). Defaults to public endpoints if unset.

## AgentMemory (optional)

Semantic memory via [@agentmemory/agentmemory](https://github.com/rohitg00/agentmemory):

1. Run the memory server (`npm run agentmemory` or PM2 `ayra-agent-memory`)
2. Enable **AgentMemory** in Settings
3. Default URL: `http://127.0.0.1:3111`

If enabled but the server is down, AYRA skips it quickly — no long delays.

## Saving changes

Scroll to the bottom and click **Save settings** after editing any field. Secret fields show a **Saved** badge when a value is stored; paste a new value to replace.

## Profile

- **Username** — read-only after registration
- **Email** — used for verification and password reset
