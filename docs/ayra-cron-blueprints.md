# AYRA Cron & Automation Blueprints

Adapted from [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) (`cron/`, `agent/`, `skills/research`). All **Hermes** naming was changed to **AYRA**.

## What was ported

| Hermes source | AYRA destination |
|---------------|------------------|
| `cron/blueprint_catalog.py` | `src/lib/cron/blueprint-catalog.ts` |
| `cron/suggestion_catalog.py` | `src/lib/cron/suggestion-catalog.ts` |
| `cron/jobs.py` (scheduling concepts) | `src/lib/cron/schedule-blueprint.ts` + brain worker recurrence |
| `hermes_time.py` | `src/lib/ayra-time.ts` |
| `agent/retry_utils.py` | `src/lib/agent/retry.ts` |
| `agent/iteration_budget.py` | `src/lib/agent/iteration-budget.ts` |
| `skills/research/arxiv` | `arxiv-search` skill |
| — | `news-digest` skill (web search digest) |

## Automation blueprints

Blueprints are parameterized recurring tasks (morning brief, weekly review, news digest, habit check-in, etc.).

**List blueprints (authenticated):**

```http
GET /api/cron/blueprints
```

**Schedule a blueprint** (creates a recurring `CUSTOM` brain task):

```http
POST /api/cron/blueprints
Content-Type: application/json

{
  "blueprintKey": "morning-brief",
  "agentId": "<your-agent-id>",
  "values": {
    "time": "08:00",
    "deliver": "telegram"
  }
}
```

When a blueprint task completes, the brain worker automatically schedules the next run from the cron expression (`recurrenceCron` in task payload).

## Deep links

Hermes used `hermes://blueprint/...` — AYRA uses:

```
ayra://blueprint/morning-brief?time=08:00&deliver=telegram
```

## Environment

| Variable | Purpose |
|----------|---------|
| `AYRA_TIMEZONE` | IANA timezone for scheduled tasks (e.g. `Asia/Jakarta`) |
| `MAX_TOOL_CALLS_PER_RUN` | Agent iteration budget (default 6) |

## Worker

Recurring blueprint tasks run via the brain worker (`npm run worker`). The worker **auto-starts the Python runtime** on port 8765 — blueprint catalog, fill validation, and next-run times are served from Python (Hermes-compatible `python/ayra/cron/`).

## Dashboard UI

Open any agent → **Automations** tab → pick a blueprint → customize fields → **Schedule automation**.

## Python runtime (required)

Cron blueprint logic runs in Python — TypeScript proxies to the sidecar:

```bash
npm run python:setup    # once, or via npm run setup
npm run python:runtime  # foreground debug
curl http://127.0.0.1:8765/health
```

| Hermes source | AYRA Python | TypeScript consumer |
|---------------|-------------|---------------------|
| `cron/blueprint_catalog.py` | `python/ayra/cron/blueprint_catalog.py` | `GET/POST /api/cron/blueprints` |
| `cron/suggestion_catalog.py` | `python/ayra/cron/suggestion_catalog.py` | same API |
| croniter scheduling | `POST /v1/cron/next` | brain worker reschedule |

After editing repo-root `cron/` or `agent/` modules:

```bash
npm run sync:python
npm run python:setup
```

See [python/README.md](../python/README.md).

## Attribution

Original cron blueprint design and catalog entries © Nous Research / Hermes Agent (MIT). Adapted for AYRA Agent's TypeScript stack, private Postgres brain tasks, and Telegram delivery.
