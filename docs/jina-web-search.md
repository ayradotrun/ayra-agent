# Web search — Jina API key (BYOK)

The **web-search** and **news-digest** skills use [Jina Reader / Search](https://jina.ai/reader) (`s.jina.ai` / `r.jina.ai`) — the same approach recommended by [Agent-Reach](https://github.com/Panniantong/Agent-Reach).

Each user brings **their own** Jina API key in **Dashboard → Settings → Web Search (Jina)**. AYRA does **not** use a platform server key from `.env` for user searches.

## Do I need a key?

| Setup | Behavior |
|-------|----------|
| **Jina key in Settings** | Best experience — higher rate limits on Jina Search/Reader |
| **No key** | Search still works: limited anonymous Jina → Bing → DuckDuckGo fallback |

## How to get a free Jina API key

1. Open **[jina.ai/?sui=apikey](https://jina.ai/?sui=apikey)** (or [jina.ai/reader](https://jina.ai/reader) → **Get API key**).
2. Sign up or log in (Google/GitHub/email).
3. In the **[API dashboard](https://jina.ai/api-dashboard)**, click **Create API key**.
4. Copy the key (starts with `jina_`).
5. In AYRA: **Dashboard → Settings → Web Search (Jina)** → paste the key → **Save settings** at the bottom of the page.

The key is stored **encrypted** on the platform database (same as LLM and Telegram keys).

## Pricing (Jina)

- New accounts receive a **one-time free token grant** (see [Jina pricing](https://jina.ai/reader#pricing)).
- After that, Jina bills per usage on your Jina account — not through AYRA.
- AYRA does not charge for Jina; you manage billing directly with Jina.

## Privacy

When web-search runs with your key, search queries are sent to **Jina AI** servers. See [Jina's terms](https://jina.ai/legal/) and our [Privacy Policy](/privacy) (third-party services).

Without a key, queries may go to Jina (anonymous tier), Bing, or DuckDuckGo depending on availability.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Slow or empty results | Add your Jina key; enable **web-search** on your agent |
| Rate limited | Wait a minute or add a Jina key for higher limits |
| Key not applied | Click **Save settings** after pasting; check **Saved** badge on the field |

For platform security, see [Security](/security).
