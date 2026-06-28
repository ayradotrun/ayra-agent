# Agents & skills

AYRA agents are configurable assistants with **skills** (tools) they can call during a run.

## Agent templates

**Dashboard → Agents → New agent** offers office templates with locked behavior profiles:

| Template | Focus |
|----------|--------|
| **Ayra** | Full toolkit — research, Solana, X, scheduling |
| **Aria** | On-chain research & wallet analysis |
| **Sienna** | X content & social workflows |
| **Marcus** | Network & wallet monitoring |
| **Nova** | Automation & brain tasks |
| **New Hire** | Custom name, skills, schedule — AYRA protocol locked |

You configure **skills and schedule** per agent. System prompts are applied server-side and are not shown in the dashboard.

See [Agent templates](/docs/templates) for the full role list.

## Skills

**Dashboard → Skills** lists available skills (web-search, wallet-tracker, rugcheck, etc.).

| Concept | Detail |
|---------|--------|
| **Global catalog** | Seeded on platform setup — operators run `npm run prisma:seed` |
| **Per-agent toggle** | **Agent → Skills** (custom agents) or fixed set (templates) |
| **Performance** | Each skill adds tools the LLM may invoke — disable unused skills for faster replies |

## Slash commands

Dashboard **Chat** and **Telegram** share the same slash commands.

| Resource | Description |
|----------|-------------|
| **[Slash commands reference](/docs/slash-commands)** | Full list — crypto, tools, agent, model commands with examples |
| **`/help`** | Live command list in chat or Telegram |
| **Type `/` in chat** | Command picker with descriptions |

Quick examples:

```
/p BONK          — price
/w [address]     — wallet analyzer
/q [CA]          — quality report
/audit [CA]      — security audit
/search [query]  — web search
/status          — agent + models
```

## Web search

Optional Jina BYOK for better rate limits — [Web search guide](/docs/jina-web-search). Works without a key via fallback chain.

## Solana skills

Configure **Settings → Solana RPC** for wallet and on-chain commands (`/w`, `/oc`, `/n`). User RPC is used for `/w` — not the server `.env` URL.

## X skills

OAuth or manual keys — drafts and optional auto-post with double opt-in. See [X manual keys](/docs/x-manual-keys).

## Chat vs scheduled runs

| Surface | Use case |
|---------|----------|
| **Dashboard → Chat** | Interactive sessions, pins, slash commands, image uploads |
| **Brain / cron** | Scheduled tweets, reminders, content calendar — stored in your **private database** |
| **Telegram** | Mobile chat via connected bot — [Telegram guide](/docs/telegram) |

## Usage analytics

**Dashboard → Overview** shows requests, input/output tokens, and estimated cost (Today / 7D / 14D / 30D).

## Run logs

**Agent → Runs** and **Logs** show token usage, tool calls, duration, and errors.

## Custom agents checklist

1. **New agent → New Hire**
2. Name + description for your reference
3. Enable a minimal skill set (3–5 to start)
4. Test in **Chat** with slash commands
5. Connect Telegram after worker is running

## Operators: adding skills

Developers add skills under `src/lib/skills/`, register in `index.ts`, and run `npm run prisma:seed`. See the [GitHub README](https://github.com/ayradotrun/ayra-agent#adding-skills).

## Related

- [Slash commands](/docs/slash-commands)
- [Getting started](/docs/getting-started)
- [Settings guide](/docs/settings)
- [FAQ — slow replies](/docs/faq)
