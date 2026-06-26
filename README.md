<p align="center">
  <img src="docs/assets/ayra-readme-banner.png" alt="AYRA — Calm · Smart · Determined" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-2D5A27?style=for-the-badge" alt="MIT License" />
  <img src="https://img.shields.io/badge/Solana-Dev_Agents-A8D08D?style=for-the-badge&logo=solana&logoColor=2D5A27" alt="Solana" />
  <img src="https://img.shields.io/badge/Element-Wind-5A8F4E?style=for-the-badge" alt="Wind" />
  <img src="https://img.shields.io/badge/Role-Strategist-2D5A27?style=for-the-badge&labelColor=F5F9F2" alt="Strategist" />
</p>

<p align="center">
  Wallet tracking · on-chain research · X workflows · Telegram · skill marketplace · private database per user
</p>

<p align="center">
  <a href="https://github.com/ayradotrun/ayra-agent">GitHub</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#performance">Performance</a> ·
  <a href="#private-database-byod">Private database</a> ·
  <a href="#star-history">Star History</a> ·
  <a href="#security">Security</a> ·
  <a href="#license">License</a>
</p>

---

**[AYRA Agent](https://github.com/ayradotrun/ayra-agent)** is a self-hostable platform for building and running **tool-using AI agents** focused on **Solana**, **meme/token research**, and **X (Twitter)** operations. Users bring their own LLM keys and **private Postgres** for chat history and brain tasks.

> **Brand palette:** forest green `#2D5A27` · leaf `#5A8F4E` · mint `#A8D08D` · cream `#F5F9F2`

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ayradotrun/ayra-agent&type=Date)](https://star-history.com/#ayradotrun/ayra-agent&Date)

Track how this repo grows on GitHub:

- **Interactive chart:** [star-history.com/#ayradotrun/ayra-agent](https://star-history.com/#ayradotrun/ayra-agent&Date)
- **Compare with Hermes Agent:** [star-history.com comparison](https://star-history.com/#NousResearch/hermes-agent&ayradotrun/ayra-agent&Date)

If the chart does not load in a preview, open the link above or paste `ayradotrun/ayra-agent` at [star-history.com](https://www.star-history.com/).

## Highlights

| Area | What you get |
|------|----------------|
| **Agents** | Office templates (Aria, Sienna, Marcus, Nova, Ayra), custom prompts, skill toggles |
| **Solana** | Wallet watch, token research, RPC monitor, AYRA scan |
| **Social** | X drafts, threads, optional auto-post (double opt-in) |
| **Chat** | Full dashboard chat with sessions, pins, slash commands, image uploads |
| **Brain** | Scheduled tweets, reminders, content calendars — AYRA Brain worker |
| **Privacy** | Required private Postgres (BYOD) for chat + brain |
| **Ops** | Run logs, token usage, Telegram notifications, cron worker |
| **Auth** | Email verification on sign up, username login, password reset via email |
| **Admin** | Platform stats & user directory (`/dashboard/admin`, `ADMIN_EMAILS`) |

## Authentication

| Feature | Detail |
|---------|--------|
| **Sign up** | `/register` — username (permanent), email, password + confirm, 6-digit email code |
| **Sign in** | `/login` — username **or** email + password |
| **Forgot password** | `/forgot-password` — reset code via email |
| **Username** | 3–30 chars, `a-z`, `0-9`, `_` — cannot be changed after registration |
| **Email (dev)** | Without SMTP, verification codes appear in server logs as `[email:dev]` |
| **Email (prod)** | Configure SMTP in `.env` (Resend recommended — see [.env.example](./.env.example)) |
| **Existing users** | After schema update, run `npm run auth:backfill` to assign usernames + mark emails verified |
| **Admin** | Set `ADMIN_EMAILS=you@domain.com` in `.env`, re-login — menu **Admin** in sidebar |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Platform Postgres (DATABASE_URL in .env)                   │
│  Users · Agents · Auth · Runs · Settings (encrypted keys)     │
└───────────────────────────┬─────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   Dashboard chat      Telegram bot       Agent worker
         │                  │                  │
         │                  │         ┌────────┴────────┐
         │                  │         ▼                 ▼
         │                  │   Python runtime    Brain cron
         │                  │   (port 8765)       scheduler
         ▼                  ▼                  ▼
┌──────────────────────────────────────────────────────────────┐
│ User's private Postgres (required — Settings on first login) │
│ chat_session · chat_message · brain_task                       │
└──────────────────────────────────────────────────────────────┘
```

**Python runtime** (`python/ayra/`) is required: worker auto-starts it for cron blueprints and Hermes-compatible scheduling. **Telegram** uses `python-telegram-bot` by default (`AYRA_TELEGRAM_PYTHON=true`); agent logic stays in Node. See [python/README.md](./python/README.md).

**Platform operators** sync schema with Prisma (`db push`). **End users** paste a Postgres URL in Settings — tables are created automatically on save.

> **Region alignment:** The platform DB (`.env`) and each user's private DB (Settings) should live in the **same region** as the AYRA server (e.g. both `eu-central-1` / Germany). Cross-region pairs (platform in Singapore, private in US, app in EU) add hundreds of ms per chat/brain query and feel sluggish. Self-host on one VPS: use local Postgres for both — see [Database region sync](#database-region-sync).

---

## Quick start

### Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | 18.18+ (20 LTS recommended) |
| **Python** | 3.9+ — required runtime sidecar for cron/automation (`npm run python:setup`) |
| **PostgreSQL** | Platform DB — [Supabase](https://supabase.com) or [Neon](https://neon.tech) |
| **LLM API key** | [OpenRouter](https://openrouter.ai/keys) recommended (one key, many models) |

> **ChatGPT Plus / Claude Pro ≠ API.** You need an API key from the provider's developer console, or use OpenRouter to access GPT/Claude/Gemma with a single key.

### 1. Clone and configure

```bash
git clone https://github.com/ayradotrun/ayra-agent.git
cd ayra-agent
cp .env.example .env
```

Edit `.env` — minimum required:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Platform Postgres (pooler URL for Supabase) — **same region as your app server** |
| `DIRECT_DATABASE_URL` | Direct Postgres URL for Prisma — **same region as private DB in Settings** |
| `NEXTAUTH_SECRET` | Session signing secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | App URL (`http://localhost:3000` in dev) |
| `ENCRYPTION_KEY` | 32+ char key for encrypting user secrets at rest |

**Email (production sign up / password reset):**

| Variable | Purpose |
|----------|---------|
| `SMTP_HOST` | e.g. `smtp.resend.com` |
| `SMTP_PORT` | `587` or `465` |
| `SMTP_USER` | Resend: literal `resend` |
| `SMTP_PASS` | Resend API key (`re_...`) or SMTP password |
| `SMTP_FROM` | Verified sender, e.g. `AYRA Agent <support@ayra.run>` |

Optional but recommended for chat:

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_API_KEY` | Global fallback LLM key (users can override in Settings) |
| `OPENROUTER_MODEL` | Default model — `google/gemma-4-31b-it:free` (fast free tier) |

See [.env.example](./.env.example) for Telegram, X OAuth, Redis, worker, and performance tuning.

### 2. Install and setup

```bash
npm install
npm run setup
```

| Command | What it does |
|---------|----------------|
| `npm install` | Installs dependencies + runs `prisma generate` (via `postinstall`) |
| `npm run setup` | Generates Prisma client, syncs platform schema, seeds skills, installs Python runtime |

Manual equivalent:

```bash
npx prisma generate
npx prisma db push
npm run prisma:seed
```

> **Note:** If `prisma migrate deploy` fails with **P3005** (database already populated), use `npx prisma db push` for the platform database instead.

### 3. Run locally

**Terminal 1** — web app:

```bash
npm run dev
```

**Terminal 2** — worker (scheduler, Telegram polling, brain tasks):

```bash
npm run worker
```

Open [http://localhost:3000](http://localhost:3000), **Sign up** at `/register`, create an agent, and open **Dashboard → Chat**.

> **Existing deployments:** after pulling auth updates, stop dev/worker, run `npx prisma db push`, then `npm run auth:backfill` for legacy accounts.

### 4. First login checklist

1. **Settings → LLM** — paste OpenRouter (or OpenAI-compatible) API key and pick a model
2. **Settings → Private Database** — paste your personal Postgres URL (required for chat history). Use the **same region** as `DATABASE_URL` in server `.env` — see [Database region sync](#database-region-sync)
3. **Settings → Web Search (Jina)** — optional [free Jina API key](https://jina.ai/?sui=apikey) for better web-search limits ([guide](./docs/jina-web-search.md))
4. **Settings → Telegram / X** — optional integrations

### Production

```bash
npm run build
npm run start
# Worker (single instance): pm2 start ecosystem.config.js
```

- Run **only one worker** per deployment to avoid duplicate Telegram replies
- Set `TELEGRAM_POLLING=false` and configure webhook URL in production
- Use HTTPS and correct `NEXTAUTH_URL`

### Docker

All-in-one (web + worker + Python runtime in one container):

```bash
cp .env.example .env   # fill OPENROUTER, NEXTAUTH_SECRET, ENCRYPTION_KEY, etc.
docker compose up --build
```

Or split services (Postgres + app + dedicated worker):

```bash
docker compose up --build db app worker
```

| Path | Role |
|------|------|
| `Dockerfile` | Node 20 + Python 3, builds Next.js and installs `python/` package |
| `docker-compose.yml` | Postgres 16, `app` (all-in-one), optional `worker` service |
| `docker/ayra-start.sh` | Starts Python runtime, worker, then `npm run start` |
| `docker/ayra-web.sh` | Web only (Python sidecar + Next.js) |
| `docker/ayra-worker.sh` | Background worker only |

Set `AYRA_REPO_ROOT=/app` and `AYRA_SKILLS_DIR=/app/skills` in Docker (compose defaults these).

Legacy Hermes s6 scripts under `docker/s6-rc.d/` are reference-only; use the `ayra-*.sh` entrypoints above.

### Python modules (skills, agent, cron)

Repo-root folders are first-class AYRA sources:

| Folder | Purpose | Related env |
|--------|---------|-------------|
| `skills/` | Playbook SKILL.md → agent prompt | `AYRA_SKILLS_DIR` (optional) |
| `agent/` | Runtime utilities (retry, error classify, tool guard) | `MAX_TOOL_CALLS_PER_RUN`, `MAX_LLM_FALLBACK_ATTEMPTS` |
| `cron/` | Automation blueprints | `AYRA_PYTHON_*` (worker auto-start) |
| `docker/` | Container deploy | `AYRA_REPO_ROOT=/app` in Docker |

See [agent/README.md](./agent/README.md) for the `agent/` folder.

After editing repo-root `agent/`, `cron/`, or `skills/`:

```bash
npm run sync:python
npm run python:setup
```

---

## Performance

If agent replies feel slow, check these first — most delays come from model choice, optional services, too many tools enabled, or **database regions that do not match**.

### Database region sync

AYRA uses **two** Postgres databases:

| Database | Configured in | Holds |
|----------|---------------|--------|
| **Platform** | `.env` → `DATABASE_URL` / `DIRECT_DATABASE_URL` | Users, agents, auth, runs, encrypted settings |
| **Private** | **Dashboard → Settings → Private Database** | Chat history, brain tasks |

Every request that touches chat or brain may hit **both** databases. Keep them in the **same region** as each other and as the **AYRA app server** to avoid cross-region latency.

| Setup | Platform (`.env`) | Private (Settings) | Notes |
|-------|-------------------|--------------------|--------|
| **Self-host VPS (recommended)** | `127.0.0.1/platform_db` | `127.0.0.1/private_db` (or same DB with `AYRA_ALLOW_PLATFORM_BRAIN_DB=true`) | Both on the VPS — lowest latency |
| **Cloud (Supabase / Neon)** | Project in **eu-central-1** (Frankfurt) | Second project or DB in **eu-central-1** | Match the region in both URLs |
| **Avoid** | Singapore / US East | Different region than platform | Slow `/help`, chat load, brain cron |

**Operators:** when you provision platform Postgres, pick the region closest to where `npm run start` / PM2 runs. Tell users (or document in Settings) to paste a private URL in that **same** region.

**Self-host example** (one VPS in Germany):

```bash
# .env — platform only; never point these at the private database name by mistake
DATABASE_URL=postgresql://postgres:PASSWORD@127.0.0.1/platform_db
DIRECT_DATABASE_URL=postgresql://postgres:PASSWORD@127.0.0.1/platform_db
```

Then in **Settings → Private Database**: paste your private connection string (same host as platform, different database name) — same machine, zero cross-region delay.

See [docs/private-database.md](./docs/private-database.md) for connect steps and [Performance](#performance) for model tuning.

### Default model (fast)

AYRA defaults to **`google/gemma-4-31b-it:free`** on OpenRouter — a smaller model that responds quickly on the free tier. Large models (e.g. 405B Hermes) are slower, especially on free routes.

**Dashboard → Settings → LLM** — pick a fast model, or set in `.env`:

```bash
OPENROUTER_MODEL=google/gemma-4-31b-it:free
```

### AgentMemory (optional semantic memory)

AYRA stores basic memories in Postgres automatically. For **semantic search** via [@agentmemory/agentmemory](https://github.com/rohitg00/agentmemory), run the memory server and enable it in Settings.

**Option A — manual (dev):**

```bash
npm run agentmemory
```

**Option B — auto-start with worker:**

Add to `.env`:

```bash
AGENTMEMORY_AUTO_START=true
```

Then `npm run worker` will spawn AgentMemory if port 3111 is free.

**Option C — production (PM2):**

```bash
pm2 start ecosystem.config.js
```

Runs three apps: `ayra-agent-web`, `ayra-agent-worker`, and `ayra-agent-memory`.

After the server is up:

1. **Dashboard → Settings** → enable **AgentMemory**
2. Save (default URL: `http://127.0.0.1:3111`)
3. Viewer dashboard: [http://127.0.0.1:3113](http://127.0.0.1:3113)

> **Windows:** AgentMemory officially recommends **WSL2**. Native Windows may fail on first engine download — use WSL or run the server in Linux/Docker.

If **AgentMemory** is enabled in Settings but no server is running, AYRA skips it quickly (cached health check) — no long delays.

### Reduce tool load

Each enabled skill adds tools the LLM may call (up to 6 rounds per message). Disable unused skills under **Agent → Skills** for faster, cheaper runs.

### Environment tuning

Add to `.env` to override defaults:

| Variable | Default | Effect |
|----------|---------|--------|
| `LLM_REQUEST_TIMEOUT_MS` | `45000` | Max wait per LLM call |
| `MAX_LLM_FALLBACK_ATTEMPTS` | `3` | Stop retrying other models after N failures |
| `LLM_MAX_TOKENS` | `1536` | Shorter replies = faster |
| `MAX_TOOL_CALLS_PER_RUN` | `6` | Cap tool rounds per message |
| `CHAT_HISTORY_TURNS` | `8` | Less context = faster prompts |
| `AGENT_RUN_TIMEOUT_SECONDS` | `60` | Hard cap on total agent run |

### Deep thinking mode

Dashboard chat **Deep thinking** uses longer timeouts and reasoning — expect 30–120s for complex tasks. Use normal mode for quick Q&A.

### Fallback models

Users can set fallback models in **Settings → LLM**. Each 429/402 error triggers the next model sequentially — keep the chain short (2–3 models) for speed.

---

## Private database (required)

Every user must connect **their own Postgres** for dashboard chat history and AYRA Brain tasks.

### Database region sync

The platform database (operator `.env`) and the private database (user **Settings**) must use the **same region** as the AYRA server:

- **Self-host:** platform database in `.env` (e.g. `platform_db`) + separate private database in Settings (e.g. `private_db`) on the same VPS (`127.0.0.1`) — recommended
- **Cloud:** if `DATABASE_URL` uses Supabase **eu-central-1**, the private URL in Settings must also be **eu-central-1** (not Singapore, US, etc.)
- **Solo self-host:** you may use one Postgres database for both — set `AYRA_ALLOW_PLATFORM_BRAIN_DB=true` and paste `DIRECT_DATABASE_URL` in Settings

Mismatched regions cause noticeable delay on chat, Telegram, and brain tasks because the worker round-trips between two distant hosts.

### What users do (no CLI)

1. Create an empty Postgres database ([Supabase](https://supabase.com), [Neon](https://neon.tech), Railway, etc.) in the **same region** as the platform DB / app server
2. Copy the **connection string** (URI format)
3. **Dashboard → Settings → Private Database (AYRA)** → paste URL → **Save**

AYRA will:

- Test the connection
- Create tables automatically (`chat_session`, `chat_message`, `brain_task`)
- Migrate existing chat/brain data on first connect
- Encrypt the URL at rest (same as API keys)

Users **never** run `prisma migrate` or `db push` on their database.

### What operators do

Only the **platform** database in `.env` uses Prisma. User private databases use raw SQL `CREATE TABLE IF NOT EXISTS` via the `pg` driver. Never run `prisma db push` against the private database name — only against the platform URL in `.env`.

Detailed user-facing steps are in the Settings UI and in [docs/private-database.md](./docs/private-database.md).

---

## Web search (Jina — BYOK)

The **web-search** skill uses [Jina Reader / Search](https://jina.ai/reader) (Agent-Reach style), with Bing and DuckDuckGo fallback.

| Who | What |
|-----|------|
| **Users** | Optional free key at [jina.ai/?sui=apikey](https://jina.ai/?sui=apikey) → **Settings → Web Search (Jina)** → Save |
| **Operators** | Do **not** put Jina keys in server `.env` for users — each account uses its own encrypted key |
| **No key** | Search still works (anonymous Jina → Bing → DDG) |

Full steps: [docs/jina-web-search.md](./docs/jina-web-search.md)

---

## Security

| Control | Detail |
|---------|--------|
| **Encryption at rest** | User API keys, Telegram token, X credentials, RPC keys, Jina web-search key, private DB URLs — AES-256-GCM via `ENCRYPTION_KEY` |
| **Auth** | NextAuth credentials; bcrypt passwords; email verification on sign up; session scoped to user |
| **Email codes** | 6-digit OTP for sign up and password reset; hashed in DB; 15-minute expiry; rate limited |
| **Admin** | `/dashboard/admin` restricted to emails in `ADMIN_EMAILS` |
| **Isolation** | APIs filter by `userId`; private DB holds only that user's chat/brain rows |
| **Rate limits** | Chat and API routes throttled per user/IP |
| **Agent bounds** | Run timeout, max tool calls, no default shell access |
| **X posting** | Draft-by-default; auto-post requires user + agent opt-in. Manual keys: [docs/x-manual-keys.md](./docs/x-manual-keys.md) |
| **Logging** | Agent runs and tool usage recorded for audit |

Report vulnerabilities privately — see [SECURITY.md](./SECURITY.md).

---

## Project structure

```
src/
├── app/              # Next.js routes (dashboard, API)
├── lib/
│   ├── agent/        # Runtime, prompts, meme quality
│   ├── brain/        # AYRA Brain store, worker, tasks
│   ├── chat/         # Chat store, commands, private DB routing
│   ├── skills/       # Tool definitions
│   └── telegram/     # Bot handler, polling
├── workers/          # agent-worker.ts (cron + brain)
prisma/               # Platform schema only
storage/              # Generated images, uploads, local brain SQLite fallback
```

---

## Adding skills

1. Create `src/lib/skills/my-skill.ts` implementing `SkillDefinition`
2. Register in `src/lib/skills/index.ts`
3. Run `npm run prisma:seed`

See existing skills in `src/lib/skills/` for patterns (Zod input schema, `ctx.log`, permissions).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run worker` | Scheduler, Telegram, brain worker |
| `npm run agentmemory` | AgentMemory semantic memory server (:3111) |
| `npm run setup` | First-time setup: generate + db push + seed |
| `npm run db:push` | Sync platform schema (`prisma db push`) |
| `npm run db:verify` | Verify platform DB connection |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:seed` | Seed skill catalog |
| `npm run prisma:studio` | Database GUI |
| `npm run auth:backfill` | Backfill `username` + `emailVerified` for legacy users |
| `npm run auth:reset-password` | CLI password reset (dev/recovery) |
| `npm run lint` | ESLint |

`npm install` automatically runs `prisma generate` via `postinstall`.

---

## Environment reference

Production checklist:

- [ ] Strong `NEXTAUTH_SECRET` and `ENCRYPTION_KEY`
- [ ] HTTPS and correct `NEXTAUTH_URL`
- [ ] SMTP configured for sign-up verification and password reset (`SMTP_*`)
- [ ] `ADMIN_EMAILS` set for platform operators (optional)
- [ ] Platform and private Postgres in the **same region** as the app server (see [Database region sync](#database-region-sync))
- [ ] Supabase pooler on `DATABASE_URL`, direct on `DIRECT_DATABASE_URL`
- [ ] `TELEGRAM_POLLING=false` + webhook URL in production
- [ ] Single worker instance
- [ ] X OAuth callback registered at `X_CALLBACK_URL`
- [ ] Fast default model set (`OPENROUTER_MODEL` or per-user in Settings)

Full variable list: [.env.example](./.env.example)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Security reports: [SECURITY.md](./SECURITY.md) (private disclosure only).

---

## License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE).

You may use, modify, and distribute the software with attribution. The software is provided **as is**, without warranty.

---

<p align="center">
  Built for builders who ship on Solana · <a href="https://github.com/ayradotrun/ayra-agent">Star us on GitHub</a>
</p>
