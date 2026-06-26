# Telegram bot

Connect a Telegram bot to chat with your agents and receive notifications from **Dashboard → Settings → Telegram**.

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

## Slash commands

Type **`/help`** (or `/start`) anytime for the full list. Commands work in **Telegram** and **Dashboard → Chat**.

### Skill commands — crypto

| Command | Action |
|---------|--------|
| `/p [token\|CA]` | Token price (alias: `/price`) |
| `/t [token\|CA]` | Token info + safety (alias: `/token`) |
| `/w [address]` | Wallet balance (alias: `/wallet`) |
| `/n [address]` | Wallet net worth (alias: `/networth`, `/nw`) |
| `/whale [address]` | Whale check (alias: `/wh`) |
| `/q [CA]` | AYRA quality report + buy/skip verdict |
| `/rug [CA]` | Rug check (alias: `/rugcheck`, `/r`) |
| `/f [name]` | Find token by name (alias: `/find`) |
| `/mintinfo [CA]` | On-chain mint info (alias: `/mi`) |
| `/ayrascan` | AYRA meme scan (alias: `/y`, `/scan`) |
| `/trending` | Trending tokens (alias: `/tr`) |
| `/network` | Solana network stats |
| `/sns [name]` | Resolve `.sol` domain |

### Skill commands — tools

| Command | Action |
|---------|--------|
| `/search [query]` | Web search (Jina → Bing → DuckDuckGo) |
| `/rpc` | Solana RPC health |

### Agent commands

| Command | Action |
|---------|--------|
| `/help` | Full command list (same as `/start`) |
| `/agents` | List your agents |
| `/use [name]` | Switch default agent |
| `/status` | Active agent, chat/image models, account |
| `/tasks` | Pending brain tasks (tweets, reminders, calendar) |
| `/post [text]` | Post to X (auto-post must be enabled) |
| `/image [prompt]` | Generate an image |

### Model commands

| Command | Action |
|---------|--------|
| `/model [name]` | Switch chat model |
| `/models` | List chat + image models |
| `/models chat` | List chat models only |
| `/models image` | List image models only |
| `/custommodel [provider/model]` | Set custom chat model ID |
| `/imagemodel [name]` | Switch image model |
| `/customimagemodel [provider/model]` | Set custom image model ID |

**Tip:** paste a Solana **contract address (CA)** directly — AYRA runs a quick token lookup without a slash command.

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

More: [FAQ](/docs/faq).
