# Agents & skills

AYRA agents are configurable assistants with **skills** (tools) they can call during a run.

## Agent templates

**Dashboard → Agents → New agent** offers office templates:

| Template | Focus |
|----------|--------|
| **Ayra** | Full toolkit — research, Solana, X, scheduling |
| **Aria** | Content & social workflows |
| **Sienna** | Research & analysis |
| **Marcus** | On-chain & wallet monitoring |
| **Nova** | Automation & brain tasks |

You can customize the system prompt, model overrides, and enabled skills per agent.

## Skills

**Dashboard → Skills** lists available skills (web-search, wallet-watch, x-draft, etc.).

| Concept | Detail |
|---------|--------|
| **Global catalog** | Seeded on platform setup — operators run `npm run prisma:seed` |
| **Per-agent toggle** | **Agent → Skills** — enable only what you need |
| **Performance** | Each skill adds tools the LLM may invoke — disable unused skills for faster replies |

### Chat slash commands

Dashboard **Chat** and **Telegram** share the same slash commands. Type `/help` for the live list, or see [Telegram bot — slash commands](/docs/telegram#slash-commands).

Quick examples: `/search [query]`, `/p [token]`, `/q [CA]`, `/ayrascan`, `/agents`, `/status`, `/image [prompt]`, `/model [name]`.

### Web search

Requires no key (fallback chain) or optional Jina BYOK — [Web search guide](/docs/jina-web-search).

### Solana skills

Configure **Settings → Solana RPC** for reliable on-chain calls.

### X skills

OAuth or manual keys — drafts and optional auto-post with double opt-in.

## Chat vs scheduled runs

| Surface | Use case |
|---------|----------|
| **Dashboard → Chat** | Interactive sessions, pins, slash commands, image uploads |
| **Brain / cron** | Scheduled tweets, reminders, content calendar — stored in your **private database** |
| **Telegram** | Mobile chat via connected bot — [Telegram guide](/docs/telegram) |

## Run logs

**Agent → Runs** and **Logs** show token usage, tool calls, duration, and errors. Use these when debugging slow or failed runs.

## Custom agents

1. **New agent → Custom**
2. Write a clear system prompt (role, tone, constraints)
3. Enable a minimal skill set
4. Test in **Chat** before enabling Telegram or cron

## Operators: adding skills

Developers can add skills in the repo under `skills/` and register them in the seed catalog. See the [GitHub README](https://github.com/ayradotrun/ayra-agent#adding-skills) for `npm run sync:python` and seed steps.

## Related

- [Getting started](/docs/getting-started)
- [Settings guide](/docs/settings)
- [FAQ — slow replies](/docs/faq#slow-replies)
