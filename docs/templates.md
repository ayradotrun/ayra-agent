# Agent templates

Office templates ship with curated prompts and default skill sets. Create one via **Dashboard → Agents → New agent**.

## Templates

| Template | Focus | Suggested skills |
|----------|--------|------------------|
| **Ayra** | Full toolkit | Research, Solana, X, scheduling |
| **Aria** | Content & social | x-draft, viral-topic-finder |
| **Sienna** | Research & analysis | web-search, news-digest |
| **Marcus** | On-chain monitoring | wallet-tracker, solana-rpc-monitor |
| **Nova** | Automation & brain | brain tasks, x-draft |

## Custom agents

1. Choose **Custom** when creating an agent.
2. Write a clear system prompt (role, tone, constraints).
3. Enable only skills you need — fewer tools = faster replies.
4. Test in **Chat** before enabling Telegram or cron.

## Model overrides

Per-agent model overrides are optional. Default chat/image models come from **Settings → LLM**.

## Template tips

- Start with **3–5 skills**, add more after testing.
- Use `/status` in chat to confirm model and agent ID.
- Duplicate an agent by creating a new one with the same prompt if you need variants.

See [Agents & skills](/docs/agents-and-skills) and [Examples](/docs/examples).
