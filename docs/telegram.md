# Telegram bot

Connect a Telegram bot to chat with your agents and receive notifications from **Dashboard → Settings → Telegram**.

For the **complete command reference** (every slash command, aliases, and examples), see **[Slash commands](/docs/slash-commands)**.

## 1. Create a bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Send `/newbot` and follow the prompts.
3. Copy the **bot token** (format `123456789:ABC...`).

## 2. Get your chat ID

**Personal chat:**

1. Message your new bot once.
2. Visit `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser.
3. Find `"chat":{"id": ...}` — that number is your chat ID.

**Group:** add the bot to the group, send a message, then read `getUpdates` for the group chat ID (negative number).

## 3. Configure AYRA

1. **Dashboard → Settings → Telegram**
2. Paste **Bot token** and **Chat ID**
3. Click **Save settings** at the bottom of the page

## 4. Start the worker

Telegram polling and replies are handled by the **worker**, not the web process alone:

```bash
npm run worker
```

Production: run **one** worker instance (PM2) — multiple workers can duplicate replies.

## Slash commands (summary)

Type **`/help`** anytime for the live list. Commands work in **Telegram** and **Dashboard → Chat**.

| Category | Examples |
|----------|----------|
| **Crypto** | `/p`, `/w`, `/q`, `/rug`, `/audit`, `/trending`, `/oc`, `/yield` |
| **Tools** | `/search`, `/rpc`, `/x` |
| **Agent** | `/help`, `/agents`, `/use`, `/status`, `/tasks`, `/post`, `/image` |
| **Models** | `/model`, `/models`, `/imagemodel`, `/custommodel` |

**Tip:** paste a Solana **contract address (CA)** directly — AYRA runs a quick token lookup without a slash command.

→ **[Full slash commands reference](/docs/slash-commands)**

## Production: webhook vs polling

| Mode | When |
|------|------|
| **Polling** (default in dev) | Worker calls Telegram `getUpdates` — simple for VPS without HTTPS webhook |
| **Webhook** | Set `TELEGRAM_POLLING=false`, HTTPS URL, configure webhook in `.env` |

Operators: see [Deployment](/docs/deployment) for PM2 and HTTPS.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Bot never replies | Ensure `npm run worker` is running; only **one** worker per deployment |
| Slow replies | Match [database regions](/docs/private-database#region-sync-platform-env--settings); use a faster LLM model |
| Invalid token | Regenerate in BotFather; re-save in Settings |
| Wrong chat | Verify chat ID from `getUpdates` after messaging the bot |

More: [FAQ](/docs/faq) · [Troubleshooting](/docs/troubleshooting).
