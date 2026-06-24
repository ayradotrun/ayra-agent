# Folder `agent/` — apa fungsinya di AYRA?

Folder ini **bukan** runtime agent Hermes CLI. Di AYRA, chat agent berjalan di **TypeScript** (`src/lib/agent/runtime.ts`).

`agent/` adalah **source library** modul utilitas yang di-port ke AYRA. Hanya subset yang dipakai.

## Alur data

```
agent/*.py (repo root)
    │
    ├─► npm run sync:python ──► python/ayra/agent/   (Python sidecar)
    │
    └─► hand-port ────────────► src/lib/agent/*.ts    (chat runtime — yang dipakai user)
```

## Modul yang AKTIF dipakai AYRA

| File source (`agent/`) | Dipakai di AYRA | Fungsi |
|------------------------|-----------------|--------|
| `error_classifier.py` | `src/lib/agent/error-classifier.ts` | Klasifikasi error LLM → retry / ganti model |
| `retry_utils.py` | `src/lib/agent/retry.ts` | Backoff + retry panggilan API |
| `iteration_budget.py` | `src/lib/agent/iteration-budget.ts` | Batas jumlah tool call per chat |
| `turn_retry_state.py` | `src/lib/agent/turn-retry-state.ts` | State retry per turn LLM |
| `tool_guardrails.py` | `src/lib/agent/tool-loop-guard.ts` | Deteksi loop tool call berulang |
| `skill_bundles.py` | via `skills/` + runtime prompt | Bundle SKILL.md (playbook) |
| `skill_utils.py` | Python sidecar | Helper skill (sync only) |

Env yang mengontrol runtime agent: lihat bagian **5. AGENT RUNTIME** di `.env.example`
(`MAX_TOOL_CALLS_PER_RUN`, `AGENT_RUN_TIMEOUT_SECONDS`, `MAX_LLM_FALLBACK_ATTEMPTS`, dll.)

## Modul yang TIDAK dipakai (referensi / future)

File seperti `conversation_loop.py`, `tool_executor.py`, `prompt_builder.py`, transports, browser, image gen — **runtime Hermes CLI penuh**. AYRA tidak menjalankannya; logic chat ada di `src/lib/agent/runtime.ts`.

Jangan hapus folder ini jika masih dipakai sebagai source untuk `sync:python`.

## Setelah edit file di `agent/`

```bash
npm run sync:python    # update python/ayra/agent/
npm run python:setup   # reinstall package Python
```

Untuk modul yang dipakai di chat, update juga port TypeScript di `src/lib/agent/` (file di atas).

## Cron & skills (folder terpisah)

| Folder | Fungsi | Runtime |
|--------|--------|---------|
| `cron/` | Blueprint otomatisasi | Python `/v1/blueprints` + brain worker TS |
| `skills/` | Playbook SKILL.md | Agent prompt + `/api/skills/bundles` |

Lihat [docs/ayra-python-sync-manifest.md](../docs/ayra-python-sync-manifest.md).
