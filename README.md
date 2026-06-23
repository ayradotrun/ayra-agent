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

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Platform Postgres (DATABASE_URL in .env)                   │
│  Users · Agents · Auth · Runs · Settings (encrypted keys)   │
└───────────────────────────┬─────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   Dashboard chat      Telegram bot       Agent worker
         │                  │                  │
         ▼                  ▼                  ▼
┌──────────────────────────────────────────────────────────────┐
│ User's private Postgres (required — Settings on first login) │
│ chat_session · chat_message · brain_task                       │
└──────────────────────────────────────────────────────────────┘
```

**Platform operators** sync schema with Prisma (`db push`). **End users** paste a Postgres URL in Settings — tables are created automatically on save.

---

## Quick start

### Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | 18.18+ (20 LTS recommended) |
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
| `DATABASE_URL` | Platform Postgres (pooler URL for Supabase) |
| `DIRECT_DATABASE_URL` | Direct Postgres URL for Prisma |
| `NEXTAUTH_SECRET` | Session signing secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | App URL (`http://localhost:3000` in dev) |
| `ENCRYPTION_KEY` | 32+ char key for encrypting user secrets at rest |

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
| `npm run setup` | Generates Prisma client, syncs platform schema, seeds skill catalog |

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

Open [http://localhost:3000](http://localhost:3000), register, create an agent, and open **Dashboard → Chat**.

### 4. First login checklist

1. **Settings → LLM** — paste OpenRouter (or OpenAI-compatible) API key and pick a model
2. **Settings → Private Database** — paste your personal Postgres URL (required for chat history)
3. **Settings → Telegram / X** — optional integrations

### Production

```bash
npm run build
npm run start
# Worker (single instance): pm2 start ecosystem.config.js
```

- Run **only one worker** per deployment to avoid duplicate Telegram replies
- Set `TELEGRAM_POLLING=false` and configure webhook URL in production
- Use HTTPS and correct `NEXTAUTH_URL`

---

## Performance

If agent replies feel slow, check these first — most delays come from model choice, optional services, or too many tools enabled.

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

### What users do (no CLI)

1. Create an empty Postgres database ([Supabase](https://supabase.com), [Neon](https://neon.tech), Railway, etc.)
2. Copy the **connection string** (URI format)
3. **Dashboard → Settings → Private Database (AYRA)** → paste URL → **Save**

AYRA will:

- Test the connection
- Create tables automatically (`chat_session`, `chat_message`, `brain_task`)
- Migrate existing chat/brain data on first connect
- Encrypt the URL at rest (same as API keys)

Users **never** run `prisma migrate` or `db push` on their database.

### What operators do

Only the **platform** database in `.env` uses Prisma. User private databases use raw SQL `CREATE TABLE IF NOT EXISTS` via the `pg` driver.

Detailed user-facing steps are in the Settings UI and in [docs/private-database.md](./docs/private-database.md).

---

## Security

| Control | Detail |
|---------|--------|
| **Encryption at rest** | User API keys, Telegram token, X credentials, RPC keys, private DB URLs — AES-256-GCM via `ENCRYPTION_KEY` |
| **Auth** | NextAuth credentials; session scoped to user |
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
| `npm run lint` | ESLint |

`npm install` automatically runs `prisma generate` via `postinstall`.

---

## Environment reference

Production checklist:

- [ ] Strong `NEXTAUTH_SECRET` and `ENCRYPTION_KEY`
- [ ] HTTPS and correct `NEXTAUTH_URL`
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

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ayradotrun/ayra-agent&type=Date)](https://star-history.com/#ayradotrun/ayra-agent&Date)

Track how this repo grows on GitHub:

- **Interactive chart:** [star-history.com/#ayradotrun/ayra-agent](https://star-history.com/#ayradotrun/ayra-agent&Date)
- **Compare with Hermes Agent:** [star-history.com comparison](https://star-history.com/#NousResearch/hermes-agent&ayradotrun/ayra-agent&Date)

If the chart does not load in a preview, open the link above or paste `ayradotrun/ayra-agent` at [star-history.com](https://www.star-history.com/).

---

## License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE).

You may use, modify, and distribute the software with attribution. The software is provided **as is**, without warranty.

---

<p align="center">
  Built for builders who ship on Solana · <a href="https://github.com/ayradotrun/ayra-agent">Star us on GitHub</a>
</p>
