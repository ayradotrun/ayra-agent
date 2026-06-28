# Agent templates

Office templates ship with **locked behavior profiles** — skills, schedule, and AI protocol are pre-configured. Create one via **Dashboard → Agents → New agent**.

System prompts are **not editable** from the dashboard. AYRA applies role-specific workflows server-side.

## Templates

| Template | Role | Focus |
|----------|------|--------|
| **Ayra** | Chief Operations | Full toolkit — crypto, research, X, DevOps, scheduling |
| **Aria** | Research Analyst | Wallets, mints, on-chain briefings |
| **Sienna** | Communications Lead | X drafts, threads, content calendar |
| **Marcus** | Network Operations | RPC health, wallet watch, DEX monitoring |
| **Nina** | Infrastructure Monitor | Websites, SSL, server health |
| **Kai** | Developer Relations | GitHub, code review, error analysis |
| **Ravi** | Intelligence Officer | Web research, news, reports |
| **Nova** | AYRA Brain | Scheduled tasks, brain calendar, automation |
| **New Hire** | Custom agent | You pick name, skills, schedule — behavior still follows AYRA protocol |

## Custom agents (New Hire)

1. Choose **New Hire** when creating an agent.
2. Set **name**, **description**, **skills**, and **schedule**.
3. Behavior (tool rules, safety, output format) is managed by AYRA — not user-editable.
4. Test in **Dashboard → Chat** before enabling Telegram or cron.

## Model configuration

Chat and image models come from **Settings → LLM** (account-wide). Per-agent model overrides are optional in agent settings.

## Tips

- Start with **3–5 skills** — fewer tools = faster replies.
- Use `/status` in chat to confirm active agent and models.
- See [Slash commands](/docs/slash-commands) for all `/p`, `/w`, `/q`, etc.

## Related

- [Agents & skills](/docs/agents-and-skills)
- [Slash commands](/docs/slash-commands)
- [Examples](/docs/examples)
