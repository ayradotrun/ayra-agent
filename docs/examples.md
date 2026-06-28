# Examples

Practical workflows you can run today in **Dashboard → Chat** or **Telegram**.

Full command reference: **[Slash commands](/docs/slash-commands)**

## Token research

```
/p BONK
/q <SOLANA_CA_MINT>
/audit <SOLANA_CA_MINT>
/ayrascan
/trending
/yield SOL
```

Enable crypto skills on your agent (or use the **Ayra** template).

## Wallet watch

```
/w <WALLET_ADDRESS>
/n <WALLET_ADDRESS>
/mw <ADDR1> <ADDR2>
/oc <WALLET_ADDRESS>
```

Configure **Settings → Solana RPC** for reliable reads. `/w` uses your user RPC, not server `.env`.

## On-chain & sentiment

```
/network
/news Solana
/sim <CA> burn=10 stake=20
```

## Web research

```
/search latest Solana meme coin trends
```

Optional Jina key in Settings — [Web search guide](/docs/jina-web-search).

## X draft (no auto-post)

Ask in chat: “Draft a thread about AYRA private database for builders.” Enable **x-draft-generator** skill. Review before posting.

## Post to X (auto-post on)

```
/post Hello from AYRA — building on Solana
```

Requires X connected and **auto-post** enabled on the agent.

## Scheduled brain task

In chat: “Schedule a reminder brain task every Monday 9:00 UTC to review agent runs.”

View queue: `/tasks` in Telegram or chat.

## Image generation

```
/image futuristic emerald AI command center, minimal UI
```

Set image model in **Settings → LLM**.

## Switch model in chat

```
/model gemma
/status
```

## More

- [Slash commands](/docs/slash-commands)
- [Agents & skills](/docs/agents-and-skills)
- [Telegram](/docs/telegram)
- [Best practices](/docs/best-practices)
