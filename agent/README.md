# `agent/` folder — role in AYRA

This folder is **not** the Hermes CLI agent runtime. In AYRA, the chat agent runs in **TypeScript** (`src/lib/agent/runtime.ts`).

`agent/` is a **source library** of utility modules ported into AYRA. Only a subset is used at runtime.

## Data flow

```
agent/*.py (repo root)
    │
    ├─► npm run sync:python ──► python/ayra/agent/   (Python sidecar)
    │
    └─► hand-port ────────────► src/lib/agent/*.ts    (chat runtime — what users hit)
```

## Modules actively used by AYRA

| Source file (`agent/`) | Used in AYRA | Purpose |
|------------------------|--------------|---------|
| `error_classifier.py` | `src/lib/agent/error-classifier.ts` | Classify LLM errors → retry / switch model |
| `retry_utils.py` | `src/lib/agent/retry.ts` | Backoff + retry for API calls |
| `iteration_budget.py` | `src/lib/agent/iteration-budget.ts` | Cap tool calls per chat turn |
| `turn_retry_state.py` | `src/lib/agent/turn-retry-state.ts` | Per-turn LLM retry state |
| `tool_guardrails.py` | `src/lib/agent/tool-loop-guard.ts` | Detect repeated tool-call loops |
| `skill_bundles.py` | via `skills/` + runtime prompt | SKILL.md bundles (playbooks) |
| `skill_utils.py` | Python sidecar | Skill helpers (sync only) |

Env vars that control agent runtime: see **6. AGENT RUNTIME** in `.env.example`
(`MAX_TOOL_CALLS_PER_RUN`, `AGENT_RUN_TIMEOUT_SECONDS`, `MAX_LLM_FALLBACK_ATTEMPTS`, etc.)

## Modules not used (reference / future)

Files such as `conversation_loop.py`, `tool_executor.py`, `prompt_builder.py`, transports, browser, image gen — **full Hermes CLI runtime**. AYRA does not run them; chat logic lives in `src/lib/agent/runtime.ts`.

Do not delete this folder if it is still the source for `sync:python`.

## After editing files in `agent/`

```bash
npm run sync:python    # update python/ayra/agent/
npm run python:setup   # reinstall Python package
```

For modules used in chat, also update the TypeScript port under `src/lib/agent/` (files listed above).

## Cron & skills (separate folders)

| Folder | Purpose | Runtime |
|--------|---------|---------|
| `cron/` | Automation blueprints | Python `/v1/blueprints` + brain worker (TS) |
| `skills/` | SKILL.md playbooks | Agent prompt + `/api/skills/bundles` |

See [docs/ayra-python-sync-manifest.md](../docs/ayra-python-sync-manifest.md).
