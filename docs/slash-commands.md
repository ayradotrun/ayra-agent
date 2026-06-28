# Slash commands reference

AYRA exposes the same slash commands in **Dashboard → Chat**, **Telegram**, and the command picker (type `/` in chat).

Type **`/help`** anytime for the live list. This page is the full reference.

---

## Quick tips

| Tip | Detail |
|-----|--------|
| **Paste a CA** | Drop a Solana mint address without a command — instant price + safety lookup |
| **Follow-ups** | Ask "is it good?", "bagus ga?", "should I buy?" — the agent uses recent context |
| **Command picker** | In dashboard chat, type `/` to browse commands with descriptions |
| **Aliases** | Many commands have short aliases (e.g. `/price` → `/p`) |
| **Worker required** | Telegram commands need `npm run worker` running |

---

## Crypto commands

### Price & token lookup

| Command | Aliases | Usage | Description |
|---------|---------|-------|-------------|
| `/p` | `/price` | `/p [ticker\|CA]` | Token price via DexScreener / Jupiter |
| `/t` | `/token` | `/t [ticker\|CA]` | Token info + safety summary |
| `/f` | `/find` | `/f [name]` | Find Solana mint by ticker or name |
| `/mintinfo` | `/mi` | `/mintinfo [CA]` | On-chain mint metadata (supply, authorities) |

**Examples**

```
/p BONK
/p EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
/t WIF
/f pepe
```

### Wallet & portfolio

| Command | Aliases | Usage | Description |
|---------|---------|-------|-------------|
| `/w` | `/wallet`, `/analyze` | `/w [address] [token_CA]` | Wallet analyzer — balance, Helius funding source, bundle flags, optional token transfer analysis |
| `/n` | `/networth`, `/nw` | `/n [address]` | Estimated USD net worth (SOL + major holdings) |
| `/mw` | `/batch` | `/mw [addr1 addr2 …]` | Multi-wallet SOL balance check (read-only, max 10) |

**Examples**

```
/w 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuCFosgV
/w 7xKX… addr EPjF…   (wallet + optional token CA)
/mw addr1 addr2 addr3
```

**Note:** `/w` uses your **Settings → Solana RPC** (or public mainnet if unset). Funding/bundle analysis requires `HELIUS_API_KEY` on the server.

### Safety & quality

| Command | Aliases | Usage | Description |
|---------|---------|-------|-------------|
| `/rug` | `/rugcheck`, `/r` | `/rug [CA]` | Quick rug-risk score (rugcheck.xyz) |
| `/audit` | `/sec` | `/audit [CA]` | Full security audit — authorities, liquidity, LP lock, alert level |
| `/q` | `/quality` | `/q [CA]` | AYRA quality report + buy/skip verdict (pair age ≤ 7 days) |
| `/ayrascan` | `/y`, `/scan` | `/ayrascan` | Scan trending memes with quality filters |

**Examples**

```
/rug So11111111111111111111111111111111111111112
/audit EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
/q [your_mint_CA]
/ayrascan
```

### Market & on-chain

| Command | Aliases | Usage | Description |
|---------|---------|-------|-------------|
| `/trending` | `/tr` | `/trending` | Top trending Solana tokens (DexScreener) |
| `/network` | — | `/network` | Solana TPS, epoch, validator version |
| `/oc` | `/chain` | `/oc [wallet\|tx\|CA]` | Real-time on-chain data — wallet activity, tx details, or token supply |
| `/news` | `/sent` | `/news [topic]` | Crypto news aggregation + bullish/bearish sentiment |
| `/yield` | `/yld` | `/yield [token]` | Compare Solana DeFi yield pools (APY, TVL, IL risk) |
| `/sim` | — | `/sim [CA] [burn=10 stake=20]` | Tokenomics simulator (burn, staking rewards) |
| `/prog` | — | `/prog [program_id]` | Solana program deployment health (read-only) |
| `/sns` | — | `/sns [name]` | Resolve `.sol` domain to wallet |

**Examples**

```
/trending
/network
/oc 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuCFosgV
/news Solana
/yield SOL
/sim [CA] burn=10 stake=20 months=12
/sns bonfida
```

---

## Tool commands

| Command | Aliases | Usage | Description |
|---------|---------|-------|-------------|
| `/search` | — | `/search [query]` | Web search (Jina → Bing → DuckDuckGo). Optional Jina key in Settings |
| `/rpc` | — | `/rpc` | Solana RPC health check |
| `/x` | `/xuser`, `/twitter` | `/x [@username]` | X profile lookup (requires X API credits on developer.x.com) |

**Examples**

```
/search Solana ETF news today
/rpc
/x @solana
```

---

## Agent commands

Control which agent handles your messages and inspect account state.

| Command | Usage | Description |
|---------|-------|-------------|
| `/help` | `/help` | Full command list (same as `/start` on Telegram) |
| `/agents` | `/agents` | List your agents |
| `/use` | `/use [name]` | Switch the active agent for this chat |
| `/status` | `/status` | Active agent, chat/image models, linked integrations |
| `/tasks` | `/tasks` | Pending brain tasks (scheduled tweets, reminders, calendar) |
| `/post` | `/post [text]` | Post to X — requires agent auto-post enabled + X connected |
| `/image` | `/image [prompt]` | Generate an image via your configured image model |

**Examples**

```
/agents
/use Ayra
/status
/tasks
/post Building on Solana with AYRA 🌿
/image cyberpunk Solana cityscape at night
```

---

## Model commands

Switch LLM models without opening Settings. Defaults come from **Settings → LLM** if not overridden.

| Command | Usage | Description |
|---------|-------|-------------|
| `/model` | `/model [name]` | Switch chat model by preset name |
| `/models` | `/models` | List chat + image models |
| `/models chat` | `/models chat` | List chat models only |
| `/models image` | `/models image` | List image models only |
| `/custommodel` | `/custommodel [provider/model-id]` | Set a custom OpenRouter-style chat model ID |
| `/imagemodel` | `/imagemodel [name]` | Switch image model preset |
| `/customimagemodel` | `/customimagemodel [provider/model-id]` | Set custom image model ID |

**Examples**

```
/model gemma
/models
/custommodel nousresearch/hermes-3-llama-3.1-405b:free
/imagemodel riverflow
```

Free-tier tip: start with `google/gemma-4-31b-it:free` for fast replies.

---

## Natural language (no slash)

These work without a command when the message is short and unambiguous:

| You send | AYRA does |
|----------|-----------|
| Solana mint address (CA only) | Token price + safety card |
| `@username` or "X account …" | X profile lookup |
| "sol price" / "harga sol" | SOL/USD price |
| "trending" / "hot tokens" | Trending Solana tokens |
| "rug check [CA]" with mint in message | Rugcheck scan |

For everything else, use natural language in chat — the agent picks tools automatically based on enabled skills.

---

## Dashboard chat extras

| Feature | How |
|---------|-----|
| **Command picker** | Type `/` — arrow keys to navigate, Enter to insert |
| **Quick chips** | Empty chat shows popular commands |
| **Deep thinking** | Toggle for longer reasoning (slower, more thorough) |
| **Image upload** | Attach images for vision-capable models |
| **Pinned sessions** | Pin important chats from the sidebar |

---

## Telegram-specific notes

1. Connect bot token + chat ID in **Settings → Telegram**
2. Run **`npm run worker`** (one instance per deployment)
3. Production: prefer webhook mode — see [Telegram bot](/docs/telegram)

If `/help` is slow, align platform and private Postgres regions — [Private database](/docs/private-database).

---

## Related docs

- [Telegram bot](/docs/telegram)
- [Agents & skills](/docs/agents-and-skills)
- [Settings guide](/docs/settings)
- [Getting started](/docs/getting-started)
